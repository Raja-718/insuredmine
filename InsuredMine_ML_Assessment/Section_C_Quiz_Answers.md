# Section C – Quick Quiz

**1. What is the purpose of a vector database like FAISS in a RAG pipeline?**

FAISS stores document/chunk **embeddings** and performs fast **approximate
nearest-neighbour search** over them. In a RAG pipeline it is the *retrieval*
step: the user query is embedded, and FAISS returns the most semantically
similar chunks in milliseconds — even across millions of vectors — so the LLM
can be grounded on relevant context instead of relying on its parametric memory.

---

**2. Which metric is best suited for regression model evaluation when outliers
are present?**

**A) MAE.**
MAE averages the absolute errors, so every point contributes linearly. RMSE
squares the errors and therefore lets a few outliers dominate the score; R² is
likewise inflated/deflated by extreme points, and Accuracy is a classification
metric. When outliers are present and you don't want them to distort the metric,
**MAE** is the most robust choice.

---

**3. What is the difference between Named Entity Recognition (NER) and Text
Classification?**

- **NER** is a *token/span-level* task: it locates and labels specific entities
  *inside* the text (e.g., PERSON = "Ramesh Kumar", DATE = "17-04-1985").
- **Text Classification** is a *document-level* task: it assigns one (or more)
  labels to the *whole* text (e.g., "spam" vs "not spam", sentiment = positive).

In short, NER answers *"which spans are what kind of entity?"* while text
classification answers *"what category does this whole document belong to?"*.

---

**4. What are some advantages of using FastAPI over Flask in ML model
deployment?**

- **Async & performance:** built on ASGI/Starlette, so it handles concurrent
  inference requests efficiently (Flask is synchronous WSGI by default).
- **Automatic validation & docs:** Pydantic type hints validate request/response
  payloads and auto-generate interactive **Swagger/OpenAPI** docs — invaluable
  for teams consuming the model (e.g., a Node.js backend).
- **Type safety & speed of development:** fewer boilerplate errors, clearer
  contracts, and native support for background tasks and dependency injection.

---

**5. How would you secure a REST API that exposes a premium prediction
endpoint?**

- **Authentication & authorisation:** require API keys or OAuth2/JWT tokens, and
  scope access by role so only permitted services can call the endpoint.
- **Transport security:** serve strictly over **HTTPS/TLS**.
- **Input validation & rate limiting:** validate payloads (Pydantic) to block
  malformed/malicious input, and throttle requests to prevent abuse/DoS.
- **Operational hardening:** never expose the model internals or stack traces,
  keep secrets in a vault/env (not code), log and monitor access, and place the
  service behind an API gateway/WAF. Add input/output guards to avoid leaking
  PII in responses.
