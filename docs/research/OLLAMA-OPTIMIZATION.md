# 🍎 Ollama Optimization for M3 Max (36GB RAM)

This configuration is optimized for high-fidelity pedagogical simulations on Apple Silicon.

## 1. Recommended Models
- **Maestro (Teacher):** `llama3.1:8b`
- **Student (Synthetic):** `llama3.2:3b`
- **Judge (Evaluator):** `mistral-nemo:12b`

## 2. Environment Configuration
```bash
export OLLAMA_MAX_LOADED_MODELS=3
export OLLAMA_NUM_PARALLEL=4
export OLLAMA_KEEP_ALIVE=30m
```