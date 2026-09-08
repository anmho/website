# Random Forest vs XGBoost

A random forest is a collection of decision trees, but the trees are trained mostly independently and then combined.

### A single decision tree

Start with tabular features:

```text
age = 32
income = 140000
years_experience = 8
embedding_similarity = 0.82
```

The tree repeatedly asks questions:

```text
embedding_similarity > 0.75?
├── yes
│   years_experience > 5?
│   ├── yes → leaf
│   └── no  → leaf
└── no
    income > 100000?
    ├── yes → leaf
    └── no  → leaf
```

The leaf contains a prediction.

For **classification**, a tree might output a class or class probability:

```text
Tree 1 → relevant
Tree 2 → relevant
Tree 3 → irrelevant
Tree 4 → relevant
Tree 5 → irrelevant
```

The forest combines them, typically by majority vote or averaging probabilities:

$$
P(\text{relevant}) = \frac{0.9+0.8+0.3+0.7+0.4}{5} = 0.62
$$

So the forest predicts relevant.

For **regression**, every tree directly outputs a number, and the forest averages them:

$$
\hat y = \frac{4.2+5.1+3.9+4.7}{4}
$$

### Why have many trees?

If you trained 500 identical trees on the exact same data, they'd be largely redundant. Random forests deliberately make each tree somewhat different in two ways.

First, each tree gets a **bootstrap sample** of the training data — randomly sampled rows with replacement:

```text
Original:        A B C D E
Tree 1 training: A A C D E
Tree 2 training: B B C E E
Tree 3 training: A B B D E
```

Second, at each split, the tree only considers a **random subset of features**. If you have 100 features, a node might only be allowed to consider 10 randomly selected ones.

That creates a diverse population of trees. The intuition:

$$
\boxed{\text{many noisy, somewhat independent models}} \rightarrow \boxed{\text{average them}}
$$

which reduces variance and overfitting.

### Random forest vs XGBoost

|                         | Random Forest              | XGBoost                                        |
| ----------------------- | --------------------------- | ----------------------------------------------- |
| Trees trained           | Independently                | Sequentially                                     |
| Main idea               | Average many diverse trees   | Each new tree corrects previous errors           |
| Final prediction        | Average / vote               | Sum                                               |
| Parallelizable training | Very easily                  | Less so                                           |
| Trees                   | Usually deeper               | Usually shallower                                 |
| Bias/variance intuition | Mainly reduces variance      | Mainly reduces bias while controlling variance    |

**Random Forest:**

$$
\boxed{\text{build many independent trees} \rightarrow \text{average}}
$$

**Gradient Boosting / XGBoost:**

$$
\boxed{\text{build tree} \rightarrow \text{find mistakes} \rightarrow \text{build next tree to correct them} \rightarrow \text{sum}}
$$

Both ultimately map:

$$
\text{tabular features} \rightarrow \text{prediction}
$$

### Where it shows up

Both are workhorses for **L1 reranking** in [a candidate retrieval system](/articles/designing-a-job-candidate-retrieval-system): cheap, fast, tree-based models that take a handful of features (BM25 score, embedding similarity, recency, popularity) and cut a candidate list from ~1000 down to ~100 before an expensive cross-encoder takes over.
