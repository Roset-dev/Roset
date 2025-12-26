# Roset CSI Driver

Kubernetes CSI (Container Storage Interface) driver for mounting Roset-managed object storage as persistent volumes.

## Overview

The Roset CSI Driver enables Kubernetes pods to mount Roset filesystems using the `roset-fuse` binary. It implements the CSI specification and runs as a DaemonSet on each node.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │     Pod A      │  │     Pod B      │  │     Pod C      │ │
│  │                │  │                │  │                │ │
│  │  /data (mount) │  │  /data (mount) │  │  /data (mount) │ │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘ │
│          │                   │                   │          │
│  ┌───────▼───────────────────▼───────────────────▼────────┐ │
│  │                   roset-csi DaemonSet                   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │ │
│  │  │   Identity   │  │  Controller  │  │     Node     │  │ │
│  │  │   Service    │  │   Service    │  │   Service    │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │ │
│  └───────────────────────────┬────────────────────────────┘ │
│                              │                              │
│  ┌───────────────────────────▼────────────────────────────┐ │
│  │                      roset-fuse                         │ │
│  │              (FUSE filesystem daemon)                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Roset Control Plane                       │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites

- Kubernetes 1.20+
- `kubectl` configured
- Roset API credentials

### Deploy

```bash
# Apply CRDs and RBAC
kubectl apply -f deploy/kubernetes/

# Create secret with API credentials
kubectl create secret generic roset-credentials \
  --namespace roset-system \
  --from-literal=api-url=https://api.roset.dev \
  --from-literal=api-key=rsk_...
```

## Usage

### StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: roset
provisioner: csi.roset.dev
parameters:
  mountId: "optional-mount-id"
reclaimPolicy: Retain
volumeBindingMode: Immediate
```

### PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-roset-data
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: roset
  resources:
    requests:
      storage: 100Gi  # Note: This is for quota only, Roset is unlimited
```

### Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ml-training
spec:
  containers:
    - name: trainer
      image: pytorch/pytorch:latest
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: my-roset-data
```

## CSI Services

| Service | Description |
|---------|-------------|
| **Identity** | Driver name, version, capabilities |
| **Controller** | Volume provisioning (CreateVolume, DeleteVolume) |
| **Node** | Mount operations (NodePublishVolume, NodeUnpublishVolume) |

## Configuration

Environment variables for the CSI driver:

| Variable | Description | Default |
|----------|-------------|---------|
| `CSI_ENDPOINT` | CSI socket path | `unix:///csi/csi.sock` |
| `NODE_ID` | Kubernetes node name | Required |
| `ROSET_API_URL` | Roset API URL | Required |
| `ROSET_API_KEY` | Roset API key | Required |

## Development

```bash
# Build
cargo build --release

# Run locally (for testing)
./target/release/roset-csi \
  --csi-endpoint unix:///tmp/csi.sock \
  --node-id test-node

# Build Docker image
docker build -f csi/Dockerfile -t roset/csi:dev .
```

## License

Apache-2.0
