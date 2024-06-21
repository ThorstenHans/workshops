# Setting up SpinKubes

In this module we'll explore the building blocks of SpinKube and guide your through the process of setting up SpinKube on a Kubernetes cluster. By the end of this module you will have mastered the following objectives:

- Understand the building blocks and components of SpinKube
- Deployed necessary dependencies of SpinKube
- Being able to determine if a particular Kubernetes cluster can run SpinKube
- Deployed SpinKube to a Kubernetes cluster
- Applied segmentation to distribute WebAssembly workloads on particular Kubernetes worker nodes

## SpinKube Building Blocks

SpinKube is an open source stack for running serverless WebAssembly workloads natively on Kubernetes. SpinKube allows you to run more workloads on the same amount of compute resources to drive density and reduce cost-per-workload.

SpinKube consists of three major components which will be deployed to Kubernetes:

1. `containerd-shim-spin`: A [containerd shim](https://github.com/containerd/containerd/blob/main/core/runtime/v2/README.md#runtime-shim) implementation for Spin, which enables running Spin workloads on Kubernetes via [runwasi](https://github.com/deislabs/runwasi)
2. Runtime Class Manager: A component responsible for automating and managing the lifecycle of containerd shims in a Kubernetes environment
3. Spin Operator: A Kubernetes operator empowering users to deploy Spin Apps to their Kubernetes clusters using custom resources

The Custom Resource Definitions (CRDs) `SpinApp` and `SpinAppExecutor` act as main interface for interacting with SpinKube. The underlying _Spin Operator_ observes custom resources of type `SpinApp`. It creates and manages underlying Kubernetes primitives such as `Deployments`, `Pods`, and `Services` automatically. By leveraging a custom `RuntimeClass`, Spin Apps are executed natively on the Kubernetes worker node (using `containerd-shim-spin`).

## SpinKube System Requirements

To run SpinKube on a Kubernetes cluster, `containerd` in versions `1.6.26+` or `1.7.7+` is required. If your Kubernetes cluster is running an older version of `containerd`, SpinKube can't be deployed. Verify with your Kubernetes provider or your administrator if the cluster could be updated to a more recent version. You can also check the [compatibility list on spinkube.dev](https://www.spinkube.dev/docs/compatibility/) to see on which Kubernetes distributions SpinKube has already been tested.

You can check the `containerd` version deployed to your Kubernetes nodes, as shown here:

```bash
# Check containerd version per Kubernetes node
kubectl get nodes -o wide
NAME                    STATUS   VERSION   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
generalnp-vmss000000    Ready    v1.27.9   Ubuntu 22.04.4 LTS   5.15.0-1056-azure   containerd://1.7.7-1
generalnp-vmss000001    Ready    v1.27.9   Ubuntu 22.04.4 LTS   5.15.0-1056-azure   containerd://1.7.7-1
generalnp-vmss000002    Ready    v1.27.9   Ubuntu 22.04.4 LTS   5.15.0-1056-azure   containerd://1.7.7-1
```

Currently, SpinKube works on Linux clusters only. If your intent is to run SpinKube on top of Windows-based Kubernetes environments, create a corresponding [issue on the Spin Operator repository and let us know](https://github.com/spinkube/spin-operator/issues).

## SpinKube Dependencies

The _Spin Operator_ admission webhook system depends on [cert-manager](https://cert-manager.io) to automatically provision and manage TLS certificates. SpinKube has been tested with cert-manager `1.14.1` and newer.

For the sake of this workshop, we will deploy cert-manager in a two step process. We deploy

- Cluster-wide objects (CRDs) using `kubectl`
- Namespaced objects using the official cert-manager Helm chart

Execute the following command to deploy the cert-manager CRDs

```bash
# Deploy cert-manager CRDs
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15.0/cert-manager.crds.yaml
```

Once you have deployed the CRDs to your Kubernetes cluster, you can deploy the cert-manager Helm chart using the commands shown below:

```bash
# Add Helm Repository
helm repo add jetstack https://charts.jetstack.io --force-update

# Update Helm Repositories
helm repo update

# Deploy cert-manager to the cert-manager namespace
helm install \
  cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.15.0 \
  --set crds.enabled=false
```

### Verify cert-manager installation

Once the installation of cert-manager is finished, you can verify it by issuing a self-signed test certificate. Start by copying the following YAML resources and store them locally in a `cert-manager-test.yaml` file:

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: test-selfsigned
  namespace: cert-manager-test
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: selfsigned-cert
  namespace: cert-manager-test
spec:
  dnsNames:
    - example.com
  secretName: selfsigned-cert-tls
  issuerRef:
    name: test-selfsigned
```

Next, create the `cert-manager-test` namespace and apply the `cert-manager-test.yaml` file:

```bash
# Create the cert-manager-test namespace
kubectl create namespace cert-manager-test

# Apply cert-manager-test.yaml
kubectl apply -f ./cert-manager-test.yaml
```

After the resources have been provisioned, wait a few seconds and check the status of the newly created `Certificate` resource using `kubectl describe`. You should see an event stating that the requested certificate was successfully issued:

```bash
kubectl describe certificate -n cert-manager-test selfsigned-cert
xxx
```

To delete the verification workload, delete the `cert-manager-test` namespace using `kubectl delete ns cert-manager-test`.

## Deploying SpinKube

Now, that you have `cert-manager` deployed to your Kubernetes cluster, you can move on and start deploying the components of SpinKube. First, you'll start with deploying the _Runtime Class Manager_ to your cluster.

### Deploying Runtime Class Manager

The _Runtime Class Manager_ (Kwasm) is responsible for installing `containerd-shim-spin` on Kubernetes worker nodes. Its installation consists of a Helm chart which we will deploy to the cluster. Once the Helm release has been created, we must annotate the Kubernetes worker nodes that should be able to run serverless WebAssembly workloads. Depending on your actual cluster topology, you can annotate either a subset of your worker nodes or all worker nodes with the `kwasm..xxxx` annotation.

Because WebAssembly is portable by definition, you may want to use `arm64` based worker nodes for running your serverless WebAssembly workloads, which are cheaper compared to traditional `amd64` machines.

To install the _Runtime Class Manager_ Helm chart use the following command:

```bash
# Add Helm repository if not already done
helm repo add kwasm http://kwasm.sh/kwasm-operator/

# Update Helm repositories
helm repo update

# Install Runtime Class Manager
helm install \
  kwasm-operator kwasm/kwasm-operator \
  --namespace kwasm \
  --create-namespace \
  --set kwasmOperator.installerImage=ghcr.io/spinkube/containerd-shim-spin/node-installer:v0.14.1
```

#### Annotating Kubernetes worker nodes

As mentioned before, you can either annotate individual nodes using `kubect annotate node`:

```bash
# Annotate node-1 and node-2
kubectl annotate node node-1 node-2 kwasm.sh/kwasm-node=true
```

Alternatively, you can annotate all worker nodes using the `--all` flag:

```bash
# Annotate all worker nodes
kubectl annotate node --all kwasm.sh/kwasm-node=true
```

#### Verify `containerd-shim-spin` Deployments

Installation of `containerd-shim-spin` using the _Runtime Class Manager_ is an asynchronous operation, which may take a few seconds per Kubernetes node. After successfully installing `containerd-shim-spin` on a Kubernetes worker node, _Runtime Class Manager_ will label the node with the `kwasm.sh/kwasm-provisioned` label. To retrieve a list of all Kubernetes worker nodes with `containerd-shim-spin` deployed, execute the following command:

```bash
# List all Kubernetes worker nodes with containerd-shim-spin deployed to it
kubectl get no -l kwasm.sh/kwasm-provisioned
```

### Deploying Spin Operator

To deploy the `SpinApp` and `SpinAppExecutor` CRDs to the Kubernetes cluster, we will again use a simple `kubectl apply` command:

#### Deploy the Spin Operator CRDs

```bash
# Deploy SpinApp and SpinAppExecutor CRDs
kubectl apply -f https://github.com/spinkube/spin-operator/releases/download/v0.2.0/spin-operator.crds.yaml
```

#### Deploy the Spin Operator Helm chart

With the CRDs deployed to the Kubernetes cluster, we can move on and install the _Spin Operator_ Helm chart:

```bash
# Install Spin Operator Helm chart
helm install spin-operator \
  --namespace spin-operator \
  --create-namespace \
  --version 0.2.0 \
  --wait \
  oci://ghcr.io/spinkube/charts/spin-operator
```

#### Deploy the RuntimeClass

Next, we will create [RuntimeClass](https://www.spinkube.dev/docs/glossary/#runtime-class) pointing to the `spin` handler called `wasmtime-spin-v2`:

```bash
# Deploy wasmtime-spin-v2 RuntimeClass
kubectl apply -f https://github.com/spinkube/spin-operator/releases/download/v0.2.0/spin-operator.runtime-class.yaml
```

#### Deploy a SpinAppExecutor

Spin Apps must specify a reference to a `SpinAppExecutor` which is used for running the app. Create a new `SpinAppExecutor` called `containerd-shim-spin` in the `default` namespace of your Kubernetes cluster by executing the following command:

```bash
# Deploy the containerd-shim-spin SpinAppExecutor to the default namespace
kubectl apply -f https://github.com/spinkube/spin-operator/releases/download/v0.2.0/spin-operator.shim-executor.yaml
```

## Exercise

<details>
  <summary>Adding a tailored SpinAppExecutor</summary>

You deployed SpinKube including all its components and dependencies as part of this module. Although the predefined `SpinAppExecutor` is a great starting point, you may want to have multiple `SpinAppExecutors` deployed to your cluster to enforce workload segregation or to leverage a custom configuration.

### Task

Create a new namespace called `exercise-one` and deploy an individual `SpinAppExecutor` called `custom-executor` to the namespace.

### Hints

Some tips that may help completing this exercise:

- You can inspect the YAML representation of the standard `SpinAppExecutor` using `kubectl get spinappexecutor -n default containerd-shim-spin -o yaml`
- You can access the documentation of the `SpinAppExecutor` CRD using `kubectl explain spinappexecutor`

</details>
