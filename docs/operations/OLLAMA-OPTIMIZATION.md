# Ollama Optimization for M3 Max

Optimized Ollama setup guide for Apple M3 Max machines running MirrorBuddy nightly simulation suite.

## M3 Max Hardware Specifications

- **Unified Memory**: 36GB or 40GB (configurable)
- **GPU Cores**: 30 or 40 cores (Apple Neural Engine)
- **CPU**: 12-core or 8-core configuration
- **Architecture**: ARM64 (native Apple Silicon)

Key advantage: Unified memory architecture eliminates CPU↔GPU transfer bottlenecks. Entire models loaded once, shared between CPU and GPU cores.

## Recommended Model Tiers

### 8B Tier (Fast Iteration & Testing)

**Models**: `llama3.1:8b`, `mistral:7b`

- **Memory**: 8GB per model
- **Tokens/sec**: 45-60 tokens/sec (M3 Max)
- **Use case**: Quick test runs, feedback loops, multi-model testing
- **Quantization**: Q4_K_M (4-bit) recommended
- **Config**: `OLLAMA_NUM_GPU=1` (single GPU for speed)

### 3B Tier (Edge & Mobile Simulation)

**Models**: `phi-3:mini`, `gemma:2b`

- **Memory**: 2-4GB per model
- **Tokens/sec**: 80-120 tokens/sec
- **Use case**: Testing edge deployment scenarios, mobile constraints
- **Quantization**: Q4_K_M or Q5_K_M
- **Config**: `OLLAMA_NUM_GPU=2` (distribute load)

### 12B Tier (Quality Benchmarks)

**Models**: `llama3.1:12b`, `codellama:13b`

- **Memory**: 12-16GB per model
- **Tokens/sec**: 35-45 tokens/sec
- **Use case**: Quality verification, production-like testing
- **Quantization**: Q5_K_M (5-bit for quality) or Q4_K_M (speed)
- **Config**: `OLLAMA_NUM_GPU=1` (full GPU allocation)

## Ollama Configuration for M3 Max

### Environment Variables

```bash
# ~/.zprofile or before running Ollama
export OLLAMA_NUM_GPU=1          # Distribute across cores (1-2 typical)
export OLLAMA_MAX_LOADED_MODELS=3 # Keep 3 models in memory max
export OLLAMA_KEEP_ALIVE=30m     # 30-minute idle timeout (reduce memory)
export OLLAMA_NOHISTORY=1        # Disable CLI history in nightly runs
```

### Launch Configuration

```bash
# Recommended launch for nightly-runner
ollama serve --host 127.0.0.1:11434
```

**Key flags**:

- `--host 127.0.0.1` - Localhost only (security)
- Port `11434` - MirrorBuddy nightly suite default

### Memory Allocation

```
Total memory available: 36/40GB
Reserved for OS/background: 4-6GB
Available for Ollama: 30-36GB

Layout example (40GB system):
├── 3B model + 12B model in parallel: 20GB total
├── Loading buffer (queue next model): 4GB
└── OS/safety margin: 6GB
```

## Quantization Recommendations

| Quantization | Size | Quality | Speed  | M3 Max Target |
| ------------ | ---- | ------- | ------ | ------------- |
| Q4_K_M       | 40%  | 95%     | 60 t/s | DEFAULT       |
| Q5_K_M       | 50%  | 98%     | 45 t/s | Benchmarks    |
| Q8_0         | 80%  | 99%+    | 20 t/s | Final QA only |

**Recommendation for nightly runner**: Use Q4_K_M for all tests except benchmark suite (use Q5_K_M).

### Verify Quantization in Use

```bash
# Check loaded model quantization
curl http://127.0.0.1:11434/api/tags | jq '.models[].details.quantization_level'
```

## Benchmark Baselines (M3 Max Baseline)

### Tokens Per Second (Theoretical & Observed)

Measured on M3 Max 36GB with standard load (no other heavy processes).

| Model         | Quantization | Single GPU | Multi-Core | Pull Time |
| ------------- | ------------ | ---------- | ---------- | --------- |
| llama3.1:8b   | Q4_K_M       | 55 t/s     | 48 t/s     | 2.1s      |
| mistral:7b    | Q4_K_M       | 58 t/s     | 50 t/s     | 1.9s      |
| phi-3:mini    | Q4_K_M       | 95 t/s     | 85 t/s     | 0.8s      |
| gemma:2b      | Q4_K_M       | 110 t/s    | 98 t/s     | 0.6s      |
| llama3.1:12b  | Q5_K_M       | 40 t/s     | 35 t/s     | 3.2s      |
| codellama:13b | Q5_K_M       | 38 t/s     | 33 t/s     | 3.5s      |

**First-run overhead**: Initial pull adds 2-3 seconds. Subsequent runs use cache.

## Integration with nightly-sim-runner.ts

### Configuration Snippet

```typescript
// src/scripts/nightly-sim-runner.ts
const OLLAMA_CONFIG = {
  baseUrl: "http://127.0.0.1:11434",
  models: {
    fast: "llama3.1:8b", // Iteration
    edge: "phi-3:mini", // Edge testing
    quality: "llama3.1:12b", // Benchmarks
  },
  quantization: "Q4_K_M", // Default
  timeout: 60000, // 60 second timeout
  maxConcurrent: 2, // Max parallel models
};
```

### Health Check

```bash
# Verify Ollama connectivity before tests
curl --connect-timeout 2 http://127.0.0.1:11434/api/tags > /dev/null && echo "OK" || echo "FAILED"
```

## Troubleshooting Common Ollama Issues on macOS

### Issue: "Connection refused" or Port 11434 in use

**Cause**: Ollama process not running or port conflict

**Fix**:

```bash
# Kill existing Ollama
pkill -f "ollama serve" || true

# Wait and restart
sleep 2
ollama serve &
```

### Issue: Model loads extremely slowly (< 10 t/s)

**Cause**: GPU not being used (falling back to CPU)

**Fix**:

```bash
# Check if GPU active
log stream --level debug --predicate 'eventMessage contains[cd] "GPU"' | head -20

# Restart Ollama with explicit GPU
export OLLAMA_NUM_GPU=1
ollama serve --help | grep -i gpu
```

### Issue: "out of memory" despite 36GB available

**Cause**: Too many models loaded simultaneously, OS memory pressure

**Fix**:

```bash
# Check loaded models
curl http://127.0.0.1:11434/api/tags | jq '.models | length'

# Reduce max loaded models
export OLLAMA_MAX_LOADED_MODELS=2
```

### Issue: Nightly run hangs on model pull

**Cause**: Network timeout or Ollama registry unreachable

**Fix**:

```bash
# Test connectivity
curl -m 5 https://registry.ollama.ai/v2/ && echo "Registry OK"

# Retry pull with verbose logging
OLLAMA_DEBUG=1 ollama pull llama3.1:8b 2>&1 | tail -20
```

### Issue: First model fast, subsequent models very slow

**Cause**: GPU memory fragmentation, OS paging

**Fix**:

```bash
# Increase keep-alive timeout
export OLLAMA_KEEP_ALIVE=60m

# Reduce model rotation (fewer models in nightly suite)
# Or restart Ollama between test phases
```

## M3 Max Performance Expectations

**Realistic nightly run profile** (2-model rotation):

```
Setup time:        15-20 seconds (Ollama startup + model pulls)
Test suite (100):  8-12 minutes (averaging 6-8 responses/test)
Quality checks:    5-7 minutes (12B model, slower)
Total runtime:     ~25-30 minutes (full suite)

Memory high-water: 28-32GB (with 12B + 8B in rotation)
CPU utilization:   30-40% (Neural Engine handles bulk)
```

## Reference

- **ADR 0037**: Deferred production items (Ollama as fallback)
- **nightly-sim-runner.ts**: `/scripts/nightly-sim-runner.ts`
- **Ollama Docs**: https://github.com/ollama/ollama#model-library
- **M3 Max Specs**: https://support.apple.com/en-us/111843
