# 🍎 Ollama Optimization for M3 Max (36GB RAM)

This configuration is optimized for high-fidelity pedagogical simulations on Apple Silicon.

## 1. Recommended Models

- **Maestro (Teacher):** `llama3.1:8b` (High reasoning for scaffolding)
- **Student (Synthetic):** `llama3.2:3b` (Fast, efficient for behavior simulation)
- **Judge (Evaluator):** `mistral-nemo:12b` (Higher parameters for critical analysis)

## 2. Environment Configuration

To maximize M3 Max performance, set these environment variables before starting Ollama:

```bash
export OLLAMA_MAX_LOADED_MODELS=3
export OLLAMA_NUM_PARALLEL=4
export OLLAMA_KEEP_ALIVE=30m
```

## 3. Model Parameters

Ensure models are run with high context window to avoid memory loss in long sessions:

- `num_ctx`: 8192
- `num_gpu`: 1 (Ollama uses Metal by default on Mac)

```

```
