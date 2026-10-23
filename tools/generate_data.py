"""Generate precomputed data for the book's animations.

Usage: python3 tools/generate_data.py   (writes JSON files into data/)
"""
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
M32 = 0xFFFFFFFF


def mulberry32(seed):
    """Same generator as assets/js/math.js rng(), so Python and JS share the running examples."""
    s = seed & M32

    def r():
        nonlocal s
        s = (s + 0x6D2B79F5) & M32
        t = ((s ^ (s >> 15)) * (1 | s)) & M32
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & M32)) & M32) ^ t
        return ((t ^ (t >> 14)) & M32) / 2**32

    return r


def sigmoid(z):
    return 0.5 * (1 + np.tanh(z / 2))


def p_rain(h):
    return sigmoid(12 * h - 7.2)


def cls_sample(n, seed):
    r = mulberry32(seed)
    xs, ys = [], []
    for _ in range(n):
        x = r()
        xs.append(x)
        ys.append(1.0 if r() < p_rain(x) else 0.0)
    return np.array(xs), np.array(ys)


def train_mlp(x, y, x_test, y_test, width=128, epochs=12000, lr=0.01, every=100, seed=0, wd=0.0):
    rng = np.random.default_rng(seed)
    X, Xt = ((x - 0.5) * 4)[:, None], ((x_test - 0.5) * 4)[:, None]
    shapes = [(1, width), (width, width), (width, 1)]
    params = []
    for a, b in shapes:
        params += [rng.normal(0, np.sqrt(2 / a), (a, b)), np.zeros(b)]
    m = [np.zeros_like(p) for p in params]
    v = [np.zeros_like(p) for p in params]

    def forward(X, ps):
        W1, b1, W2, b2, W3, b3 = ps
        z1 = X @ W1 + b1
        h1 = np.maximum(z1, 0)
        z2 = h1 @ W2 + b2
        h2 = np.maximum(z2, 0)
        return (h2 @ W3 + b3)[:, 0], (X, z1, h1, z2, h2)

    def bits(logit, t):
        q = np.clip(sigmoid(logit), 1e-12, 1 - 1e-12)
        return float(np.mean(-(t * np.log2(q) + (1 - t) * np.log2(1 - q))))

    log = {"train": [], "test": [], "acc": []}
    for ep in range(epochs + 1):
        logit, (Xc, z1, h1, z2, h2) = forward(X, params)
        if ep % every == 0:
            log["train"].append(round(bits(logit, y), 4))
            log["test"].append(round(bits(forward(Xt, params)[0], y_test), 4))
            log["acc"].append(round(float(np.mean((logit > 0) == (y > 0.5))), 4))
        q = sigmoid(logit)
        g = ((q - y) / len(y))[:, None]
        W1, b1, W2, b2, W3, b3 = params
        gW3, gb3 = h2.T @ g, g.sum(0)
        g2 = (g @ W3.T) * (z2 > 0)
        gW2, gb2 = h1.T @ g2, g2.sum(0)
        g1 = (g2 @ W2.T) * (z1 > 0)
        gW1, gb1 = Xc.T @ g1, g1.sum(0)
        for i, gr in enumerate([gW1, gb1, gW2, gb2, gW3, gb3]):
            if i % 2 == 0:
                gr = gr + wd * params[i]
            m[i] = 0.9 * m[i] + 0.1 * gr
            v[i] = 0.999 * v[i] + 0.001 * gr**2
            mh, vh = m[i] / (1 - 0.9 ** (ep + 1)), v[i] / (1 - 0.999 ** (ep + 1))
            params[i] = params[i] - lr * mh / (np.sqrt(vh) + 1e-8)
    log["test_logits"] = [round(float(z), 3) for z in forward(Xt, params)[0]]
    return log


def write(name, obj):
    path = ROOT / "data" / name
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(obj))
    print(f"wrote {path.relative_to(ROOT)}")


def random_labels():
    x, y = cls_sample(60, 11)
    xt, yt = cls_sample(1000, 99)
    rng = np.random.default_rng(1)
    y_rand = rng.integers(0, 2, len(y)).astype(float)
    yt_rand = rng.integers(0, 2, len(yt)).astype(float)
    every = 100
    true_run = train_mlp(x, y, xt, yt, every=every)
    rand_run = train_mlp(x, y_rand, xt, yt_rand, every=every)
    true_run.pop("test_logits")
    rand_run.pop("test_logits")
    write("random-labels.json", {"every": every, "true": true_run, "random": rand_run})
    logits = train_mlp(x, y, xt, yt, epochs=150, every=every)["test_logits"]
    write("calibration.json", {"x": [round(float(v), 4) for v in xt], "y": [int(v) for v in yt], "logits": logits})


def regularization():
    x, y = cls_sample(60, 11)
    xt, yt = cls_sample(1000, 99)
    every, runs = 100, {}
    for wd in [0.0, 0.001, 0.01, 0.05]:
        log = train_mlp(x, y, xt, yt, epochs=6000, every=every, wd=wd)
        log.pop("test_logits")
        runs[str(wd)] = log
    write("regularization.json", {"every": every, "runs": runs})


def rain_nll(x, y):
    def f(w, b):
        q = np.clip(sigmoid(w * x + b), 1e-9, 1 - 1e-9)
        return float(np.mean(-(y * np.log2(q) + (1 - y) * np.log2(1 - q))))
    return f


def evolution():
    x, y = cls_sample(60, 11)
    f = rain_nll(x, y)
    rng = np.random.default_rng(5)
    lo, hi = np.array([-5.0, -15.0]), np.array([25.0, 5.0])

    pop = rng.uniform(lo, hi, (30, 2))
    ga = []
    for _ in range(25):
        fit = np.array([f(*p) for p in pop])
        ga.append({"pop": np.round(pop, 2).tolist(), "best": round(float(fit.min()), 4)})
        order = np.argsort(fit)
        children = [pop[order[0]], pop[order[1]]]
        while len(children) < len(pop):
            a, b = [min(rng.choice(len(pop), 3), key=lambda i: fit[i]) for _ in range(2)]
            t = rng.uniform(0, 1)
            child = t * pop[a] + (1 - t) * pop[b] + rng.normal(0, [1.0, 0.7])
            children.append(np.clip(child, lo, hi))
        pop = np.array(children)

    mean, sd, es = np.array([0.0, 0.0]), np.array([6.0, 4.0]), []
    for _ in range(25):
        samples = np.clip(mean + sd * rng.normal(size=(20, 2)), lo, hi)
        fit = np.array([f(*p) for p in samples])
        es.append({"pop": np.round(samples, 2).tolist(), "mean": np.round(mean, 2).tolist(),
                   "sd": np.round(sd, 2).tolist(), "best": round(float(fit.min()), 4)})
        elite = samples[np.argsort(fit)[:5]]
        mean = elite.mean(0)
        sd = np.maximum(0.9 * sd, 0.2)
    write("evolution.json", {"ga": ga, "es": es})


if __name__ == "__main__":
    random_labels()
    regularization()
    evolution()
