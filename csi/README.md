# <img src="../logo.png" width="32" height="32" align="center" /> Roset CSI Driver

Mount Roset filesystems natively in Kubernetes.

## Features

- **Stage/Publish Pattern** - Single FUSE mount per node, bind mounts per pod
- **RWX Support** - Mount the same volume to 100+ pods simultaneously
- **Snapshot Support** - Create and restore from immutable commits
- **ML Performance Tuning** - Configurable cache, read-ahead settings
- **Secure Secrets** - API keys passed via temp files, not CLI args

## Quick Start

1. **Install Helm Chart**
   ```bash
   helm install roset oci://ghcr.io/roset-dev/charts/roset-csi \
     --version 0.1.0 \
     --create-namespace \
     --namespace roset-system \
     --set roset.secretName=roset-credentials \
     --set storageClass.mountId="your-mount-id-here"
   ```

2. **Configure Credentials** (if not already created)
   ```bash
   kubectl create secret generic roset-credentials \
     --namespace roset-system \
     --from-literal=api-key=rk_...
   ```



3. **Create a PVC**
   ```yaml
   apiVersion: v1
   kind: PersistentVolumeClaim
   metadata:
     name: my-data
   spec:
     accessModes:
       - ReadWriteMany
     storageClassName: roset
     resources:
       requests:
         storage: 100Gi
   ```

## StorageClass Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `apiUrl` | Yes | Roset API endpoint |
| `mountId` | Yes | Your Roset mount ID |
| `basePath` | No | Base path for volumes (default: `/volumes`) |
| `cacheDir` | No | Local cache directory |
| `cacheSizeGi` | No | Cache size in GiB |
| `readAhead` | No | Read-ahead size in KB |
| `ref` | No | Mount a specific ref (e.g., `latest`) |

## Snapshot Support

Create a snapshot:
```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: checkpoint-v1
spec:
  volumeSnapshotClassName: roset-snapshots
  source:
    persistentVolumeClaimName: my-data
```

Restore from snapshot:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-data
spec:
  accessModes:
    - ReadOnlyMany
  storageClassName: roset
  dataSource:
    name: checkpoint-v1
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 100Gi
```

## Required Sidecars

For dynamic provisioning, deploy these sidecars with the controller:

- **[external-provisioner](https://kubernetes-csi.github.io/docs/external-provisioner.html)** - Handles CreateVolume/DeleteVolume
- **[csi-snapshotter](https://kubernetes-csi.github.io/docs/csi-snapshotter.html)** - Handles CreateSnapshot/DeleteSnapshot

See `deploy/controller-statefulset.yaml` for the complete configuration.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Node                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │               NodeStageVolume (once per node)        │   │
│  │  roset-fuse → /var/lib/kubelet/plugins/.../staging   │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                 │
│              ┌────────────┴────────────┐                   │
│              ▼                         ▼                   │
│  ┌────────────────────┐   ┌────────────────────┐          │
│  │ NodePublishVolume  │   │ NodePublishVolume  │          │
│  │   bind mount →     │   │   bind mount →     │          │
│  │   /pod-a/data      │   │   /pod-b/data      │          │
│  └────────────────────┘   └────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## License
Apache-2.0
