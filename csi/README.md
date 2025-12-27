# <img src="../logo.png" width="32" height="32" align="center" /> Roset CSI Driver

Mount Roset filesystems natively in Kubernetes.

## Quick Start

1. **Deploy Driver**
   ```bash
   kubectl apply -f deploy/kubernetes/
   ```

2. **Configure Secret**
   ```bash
   kubectl create secret generic roset-credentials \
     --from-literal=api-key=rk_...
   ```

3. **StorageClass**
   ```yaml
   apiVersion: storage.k8s.io/v1
   kind: StorageClass
   metadata:
     name: roset
   provisioner: csi.roset.dev
   ```

## Why Roset CSI?

- **RWM Support** - Mount the same bucket folder to 100+ pods simultaneously.
- **True Directories** - No prefix simulation; real directory semantics.
- **Direct I/O** - High-throughput data access direct from your bucket.

[CSI Docs](https://docs.roset.dev/csi)

## License
Apache-2.0
