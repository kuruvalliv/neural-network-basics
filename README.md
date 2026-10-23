Book Plan: How Neural Networks Learn Probability Distributions

Working title: Functions That Learn Functions: Probability, Representation, and Search in Neural Networks

Running example: a noisy 1-D regression and a binary classification task (e.g. rain vs. no rain). Every chapter returns to these, so each new idea is anchored to the same concrete case.

Part I: The Objects
Chapter 1. Probability Distributions

Question: What is a probability distribution, precisely?

Sample space, events, random variables
PMF, PDF, CDF, and the fact that each is a function from outcomes to numbers
Joint, marginal, and conditional distributions; Bayes' rule
Expectation and variance as operators on distributions
Common families: Bernoulli, categorical, Gaussian, exponential family
Chapter 2. Information, Entropy, and Cross-Entropy

Question: How do we measure how well one distribution describes another?

Surprisal: −log⁡q(y)-\log q(y)
Entropy: H(p)=−Ep[log⁡p]H(p)=-\mathbb{E}_p[\log p]
Cross-entropy: H(p,q)=−Ep[log⁡q]H(p,q)=-\mathbb{E}_p[\log q]
KL divergence: DKL(p∥q)=H(p,q)−H(p)≥0D_{KL}(p\|q)=H(p,q)-H(p)\ge 0, with proof (Gibbs' inequality)
Maximum likelihood estimation equals minimizing cross-entropy
Why the log: additivity over independent samples, and proper scoring rules
Mean squared error as Gaussian cross-entropy
Part II: Functions and Distributions Together
Chapter 3. Functions as Objects

Question: What does it mean to treat a function as a thing we can search over?

Functions as maps; function spaces; the idea of a point in a space of functions
A distribution is itself a function (y↦q(y)y\mapsto q(y))
A conditional distribution is a function that returns a function (x↦q(⋅∣x)x\mapsto q(\cdot\mid x))
Parametric families: a finite parameter vector indexing a function
Functionals: maps from functions to numbers (entropy, KL, and the loss are all functionals)
Chapter 4. The Meta-Level: Learning a Function That Describes a Function

Question: What exactly is being learned, and at which level?

This chapter resolves the confusion by separating four levels:

Level	Object	Type0	Data (xi,yi)(x_i,y_i)	Samples drawn from the world
1	True conditional p(y∣x)p(y\mid x)	Function from inputs to distributions (unknown target)
2	Network fθ(x)f_\theta(x)	Function from inputs to distribution parameters (e.g. logits)
3	Model qθ(y∣x)=g(fθ(x))q_\theta(y\mid x)=g(f_\theta(x))	The distribution those parameters define
4	Loss DKL(p∥qθ)D_{KL}(p\|q_\theta)	Functional that scores the match between levels 1 and 3
Why we model p(y∣x)p(y\mid x) and not y=f(x)y=f(x): noise, ambiguity, aleatoric uncertainty
Hypothesis class, risk, empirical risk
The parametrization map θ↦qθ\theta\mapsto q_\theta and the geometry of the model family
The chapter's core idea: the network does not output a distribution directly. It outputs the numbers that name one.
Chapter 5. How a Function's Inputs and Outputs Relate

Question: What structure connects xx and yy, and how can we exploit it?

Dependency, conditional independence, and factorization
Dimension, redundancy, and the manifold hypothesis
Invariance and equivariance (symmetry of the input-output relation)
Compositional structure: f=fL∘⋯∘f1f=f_L\circ\dots\circ f_1
Smoothness and locality as assumptions
Link to inductive bias: structure in the data tells us what kind of function to look for
Part III: Representation
Chapter 6. Building General Architectures: The Foundational Idea

Question: How do we design a function family that can represent almost anything?

Fixed basis expansions and kernel methods: f(x)=∑kwkϕk(x)f(x)=\sum_k w_k\phi_k(x)
The key step: learn the features ϕ\phi as well as the weights
The layer as the unit of design: h=σ(Wx+b)h=\sigma(Wx+b)
Stacking layers: composition builds hierarchies of features
Universal approximation: what it guarantees and what it does not
Why the last layer is "just" a linear (log-odds) readout on learned features
Chapter 7. Measuring Representational Capacity I: Activations

Question: What does the nonlinearity contribute?

Collapse of linear networks: W2W1=WW_2W_1=W
ReLU, sigmoid, tanh, GELU: shapes and properties
Piecewise-linear regions and how to count them
Smoothness, saturation, and gradient flow
Output activations as link functions: sigmoid, softmax, softplus
Exponential-family view: how the output activation determines the noise model
Chapter 8. Measuring Representational Capacity II: Topology

Question: How do depth, width, and connectivity determine what can be represented?

Parameter counting and linear-region counting
Depth-versus-width separation results
Formal capacity measures: VC dimension, Rademacher complexity
Approximation error versus estimation error (the bias–variance decomposition)
Architectural priors: convolution, recurrence, attention, and the symmetries they encode
Empirical capacity checks: memorizing random labels, and fitting curves of increasing complexity
Part IV: Search
Chapter 9. Learning as Search

Question: How is "finding the right function" a search problem?

Parameter space versus function space (many θ\theta map to the same function)
Loss landscapes: convexity, saddle points, plateaus, symmetries
Existence of good solutions versus the ability to find them
Optimization error as the third error term
Chapter 10. Gradient-Based Learning

Question: How does following the slope find a good distribution?

Derivation of gradient descent and the chain rule
Backpropagation as efficient reverse-mode differentiation
The softmax–cross-entropy gradient q−yq-y and its moment-matching interpretation
SGD, momentum, Adam; learning-rate schedules
Initialization, normalization, and vanishing or exploding gradients
Chapter 11. Gradient-Free Search

Question: What else can we use, and when?

Genetic algorithms and evolution strategies (selection, mutation, crossover)
Neuroevolution, including searching over topology (NEAT)
Random search and Bayesian optimization
Comparison with gradient descent: sample efficiency, scale, non-differentiable objectives
Hybrid approaches (evolution over architecture, gradients over weights)
Chapter 12. Generalization and Calibration

Question: When does a learned distribution stay correct on new data?

Generalization gap and regularization (weight decay, early stopping, dropout)
Implicit bias of gradient descent
Calibration and proper scoring rules (log-loss, Brier score)
Overconfidence, temperature scaling, and uncertainty estimation
Part V: Synthesis
Chapter 13. Putting It All Together
End-to-end worked example: from data to a calibrated predictive distribution
A single equation tying the book together: q^=arg⁡min⁡q∈Htopology+activations 1n∑i−log⁡q(yi∣xi)found by search\hat q=\arg\min_{q\in\mathcal H_{\text{topology+activations}}}\ \frac1n\sum_i -\log q(y_i\mid x_i)\quad\text{found by search}
Diagnostic guide: whether a failure is a representation problem (Part III), a search problem (Part IV), or a data problem (Chapters 5 and 12)
Modern extensions: generative models as learning p(x)p(x) itself; diffusion, autoregressive models, and VAEs
Appendices
A. Notation reference
B. Math prerequisites: calculus, linear algebra, basic measure-theoretic language
C. Proof sketches: Gibbs' inequality, universal approximation, softmax gradient
D. Exercises and code (NumPy) for the running example
Why this order
Part I gives the vocabulary of distributions and the loss.
Part II answers the meta-level question before any neural network appears.
Part III asks which function families are rich enough to contain the target.
Part IV asks how to find the right member of that family.

Each failure mode has a single home: not rich enough (Part III), not found (Part IV), or not enough data (Chapters 5 and 12).
