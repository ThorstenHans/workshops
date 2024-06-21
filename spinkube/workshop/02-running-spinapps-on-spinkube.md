# Running Spin Apps on Kubernetes with SpinKube

In this module we will deploy our first Spin App to Kubernetes and familiarize ourself with supporting technologies, practices and commands. By the end of this module you will:

- Understand how Spin Apps are distributed
- Examine how to distribute a Spin App 
- Run a Spin App locally using its OCI Artifact
- Scaffold a `SpinApp` CR with custom settings
- Deploy a `SpinApp` to Kubernetes
- Discover Kubernetes primitives managed by Spin Operator

## What is a Spin App

Let's quickly explore what a Spin App actually is, before we dive into running those on Kubernetes. Spin Apps can be written in any programming language that can be compiled down to WebAssembly (the `wasm32-wasi` platform).

The open source project [Spin](https://github.com/fermyon/spin) streamlines the process of creating those serverless (or event-based) WebAssembly applications. The `spin` CLI provides different templates that you can use to create new apps. By default, the following language-specific templates are available for building HTTP apps:

- `http-c`: HTTP request handler using C and the Zig toolchain
- `http-go`: HTTP request handler using (Tiny)Go -`http-grain`: HTTP request handler using Grain
- `http-js`: HTTP request handler using Javascript
- `http-php`: HTTP request handler using PHP
- `http-py`: HTTP request handler using Python
- `http-rust`: HTTP request handler using Rust
- `http-swift`: HTTP request handler using SwiftWasm
- `http-ts`: HTTP request handler using Typescript
- `http-zig`: HTTP request handler using Zig

Once you've create a Spin App using one of the templates shown above, you can run `spin build` (or `spin b`) to compile the source code into WebAssembly (a `.wasm` file will be created). Additionally, there is the Spin Manifest (`spin.toml`), which holds essential metadata - such as the actual trigger configuration - of the Spin App.

Spin Apps are distributed using OCI artifacts. An OCI artifact of a Spin App consists of the `.wasm` file and the `spin.toml`, meaning it consists of everything that is required to run a particular app in different environments. OCI artifacts can be distributed through popular registries like Docker Hub, or hosted offerings such as Azure Container Registry (ACR), Amazon Elastic Container Registry (Amazon ECR), GCP Artifact Registry, or others.

## Pre-coded Apps for this workshop

Writing Spin Apps from scratch is beyond the scope of this workshop, instead you can use the pre-coded Spin Apps located in the [apps](../apps/) folder.

## Packaging and Distributing Spin Apps

The `spin` CLI provides necessary commands for packaging and distributing Spin Apps through public and private registries.

Let's package and distribute the [`simple-app`](../apps/simple-app/) using the anonymous and ephemeral registry [ttl.sh](https://ttl.sh). When using ttl.sh, you specify how long the OCI artifact should remain available using the tag of the artifact. (The `12h` tag tells ttl.sh to keep the corresponding artifact for 12 hours):

```bash
# Move to the app directory
# We start from the repo root
cd spinkube/apps/simple-app

# Install dependencies of simple-app
npm install

# Compile simple-app to WebAssembly
spin build

# Create a random suffix for the OCI artifact repository
rand=$(($RANDOM%(9999-1000+1)+1000))

# Package and Distribute simple-app using ttl.sh
spin registry push ttl.sh/simple-app-$rand:12h
```

## Running Spin Apps from existing artifacts

You can run Spin Apps using existing OCI artifacts directly from `spin` CLI. To do so, we provide the remote registry reference using the `--from` (or `-f`) flag when executing `spin up`. Let's run the Spin App we distributed via ttl.sh in the previous section locally:

```bash
# Start simple-app from the OCI artifact reference
spin up --from ttl.sh/simple-app-$rand:12h
Serving http://127.0.0.1:3000
Available Routes:
  simple-app: http://127.0.0.1:3000 (wildcard)
```

You can test the `simple-app` from within a new terminal instance as shown here:

```bash
# curl the root endpoint of the app
curl -iX GET http://localhost:3000

HTTP/1.1 200 OK
content-type: application/json
content-length: 33
date: Thu, 20 Jun 2024 06:45:26 GMT

{"message":"Hello from SpinKube"}%

# curl the 2nd endpoint of the app
curl -iX GET http://localhost:3000/John

HTTP/1.1 200 OK
content-type: application/json
content-length: 50
date: Thu, 20 Jun 2024 06:46:37 GMT

{"message":"Hello, John! This is SpinKube!"}%
```

You can terminate the Spin App while running locally by simply hitting `<C-c>` (Control+C).

## Scaffolding Kubernetes Deployment Manifests

Having the Spin App distributed as OCI artifact, we must create a Custom Resource (CR) of type `SpinApp`. We can use the [kube plugin](https://github.com/spinkube/spin-plugin-kube) for `spin` CLI to do so.

### Installing the `kube` plugin

You can check installed plugins of `spin` CLI using `spin plugins list --installed`. Installing new plugins is done using `spin plugins install` command. Go ahead and install the `kube` plugin - if it isn't installed on your machine - as shown here:

```bash
# Check for the installed plugins
spin plugins list --installed
check-for-update 0.1.0 [installed]
cloud 0.8.0 [installed]
cloud-gpu 0.1.0 [installed]
js2wasm 0.6.1 [installed]
pluginify 0.7.0 [installed]
trigger-command 0.1 [installed]
trigger-mqtt 0.2.0 [installed]

# Fetch latest plugins from the Spin plugins Repository
spin plugins update
Plugin information updated successfully

# Show available plugins
# Optionally: Filter to show just kube plugins
spin plugins list | grep kube
kube 0.0.1
kube 0.1.0
kube 0.1.1

# Install the latest version of the kube plugin
# We specify --yes to confirm the installation automatically
spin plugin install kube --yes
Plugin 'kube' was installed successfully!

Description:
        A plugin to manage Spin apps in Kubernetes

Homepage:
        https://github.com/spinkube/spin-plugin-kube
```

### Scaffolding `SpinApp` CRs with `spin kube scaffold`

Now that you've installed the `kube` plugin for `spin`, you can use its `scaffold` sub-command to create new `SpinApp` CRs for a given OCI reference. In the easiest form, you can create a `SpinApp` as shown below:

```bash
# Create a SpinApp CR from an OCI reference
spin kube scaffold --from ttl.sh/simple-app-$rand:12h

apiVersion: core.spinoperator.dev/v1alpha1
kind: SpinApp
metadata:
  name: simple-app-2353
spec:
  image: "ttl.sh/simple-app-2353:12h"
  executor: containerd-shim-spin
  replicas: 2
```

By default, the `SpinApp` CR will be printed to `stdout`, you can redirect the output to an individual `.yaml` file to simplify modifying and deploying the Spin App to Kubernetes.

```bash
# Create a SpinApp CR and write it to ./simple-app.yaml
spin kube scaffold --from ttl.sh/simple-app-$rand:12h > simple-app.yaml
```

The `spin kube scaffold` command provides various flags that you can use to customize the resulting `SpinApp` CR. Take a second to explore the supported flags using `spin kube scaffold --help`:

```bash
Scaffold application manifest

Usage:
  kube scaffold [flags]

Flags:
      --autoscaler string                            The autoscaler to use. Valid values are 'hpa' and 'keda'
      --autoscaler-target-cpu-utilization int32      The target CPU utilization percentage to maintain across all pods (default 60)
      --autoscaler-target-memory-utilization int32   The target memory utilization percentage to maintain across all pods (default 60)
      --cpu-limit string                             The maximum amount of CPU resource units the application is allowed to use
      --cpu-request string                           The amount of CPU resource units requested by the application. Used to determine which node the application will run on
      --executor string                              The executor used to run the application (default "containerd-shim-spin")
  -f, --from string                                  Reference in the registry of the application
  -h, --help                                         help for scaffold
  -s, --image-pull-secret strings                    Secrets in the same namespace to use for pulling the image
      --max-replicas int32                           Maximum number of replicas for the application. Autoscaling must be enabled to use this flag (default 3)
      --memory-limit string                          The maximum amount of memory the application is allowed to use
      --memory-request string                        The amount of memory requested by the application. Used to determine which node the application will run on
  -o, --out string                                   Path to file to write manifest yaml
  -r, --replicas int32                               Minimum number of replicas for the application (default 2)
  -c, --runtime-config-file string                   Path to runtime config file
```

There are plenty of interesting flags here. For example, you can control how many replicas of your Spin App will be created by _Spin Operator_ by specifying the `--replicas` flag:

```bash
# Scaffold a SpinApp CR with 5 replicas (instead of 2)
spin kube scaffold --from ttl.sh/simple-app-$rand:12h --replicas 5

apiVersion: core.spinoperator.dev/v1alpha1
kind: SpinApp
metadata:
  name: simple-app-2353
spec:
  image: "ttl.sh/simple-app-2353:12h"
  executor: containerd-shim-spin
  replicas: 5
```

We'll explore more flags within upcoming sections of this workshop.

## Deploying Spin Apps to Kubernetes

Spin and its CLI do not make any assumptions how you deploy `SpinApp` CRs to your Kubernetes clusters. Instead you can use whatever is already adopted by yourself or your team. Here some popular opportunities:

- Simple deployment via `kubectl`
- Standardized deployment using Helm charts
- Declarative deployment using [GitOps](https://www.gitops.tech/)

For the sake of this workshop, you'll use `kubectl` for deploying Spin Apps to Kubernetes.

To deploy the previously scaffolded [Simple App](../apps/simple-app/), use the following `kubectl` command:

```bash
# Deploy the SpinApp to Kubernetes
kubectl apply -f ./simple-app.yaml

spinapp.core.spinoperator.dev/simple-app-2353 created
```

You can check the status of your Spin App using a simple `kubectl get spinapps`:

```bash
# List all SpinApps in the default namespace
kubectl get spinapps

NAME              READY   DESIRED   EXECUTOR
simple-app-2353   5       5         containerd-shim-spin
```

## Exploring Kubernetes Primitives managed by Spin Operator

As you've already learned, Spin Operator takes care of creating and managing underlying Kubernetes primitives for your Spin Apps. Upon deploying a new Spin App to Kubernetes, the following resources are created by Spin Operator:

- A Kubernetes `Deployment`
- A Kubernetes `Pod` per desired `replica` (`DeploymentSpec.Replicas`)
- A Kubernetes `Service` of type `ClusterIP`

Let's explore the Kubernetes clustser and spot those resources for the Spin App we deployed a minute ago:

### List and Explore the Deployment managed by Spin Operator

```bash
# List deployments in the default namespace
kubectl get deploy

NAME              READY   UP-TO-DATE   AVAILABLE   AGE
simple-app-2353   5/5     5            5           2m

```

```bash
# Explore the deployment
kubectl get deploy simple-app-2353

# YAML reduced to the most interesting parts
apiVersion: apps/v1
kind: Deployment
metadata:
  name: simple-app-2353
  ownerReferences:
  - apiVersion: core.spinoperator.dev/v1alpha1
    blockOwnerDeletion: true
    controller: true
    kind: SpinApp
    name: simple-app-2353
spec:
  replicas: 5
status:
  availableReplicas: 5
  readyReplicas: 5
  replicas: 5
  updatedReplicas: 5
```

### List and Explore the Pods managed by Spin Operator

```bash
# List pods in the default namespace
kubectl get pods

NAME                               READY   STATUS      RESTARTS      AGE
simple-app-2353-7986f76b6d-tsppg   1/1     Running     0             5m
simple-app-2353-7986f76b6d-kfr4j   1/1     Running     0             5m
simple-app-2353-7986f76b6d-67z8b   1/1     Running     0             5m
simple-app-2353-7986f76b6d-25dqt   1/1     Running     0             5m
simple-app-2353-7986f76b6d-cvp86   1/1     Running     0             5m
```

```bash
# Explore the pod
kubectl get pod simple-app-2353-7986f76b6d-tsppg

# YAML reduced to most interesting parts
kind: Pod
metadata:
  labels:
    core.spinoperator.dev/app-name: simple-app-2353
    core.spinoperator.dev/app.simple-app-2353.status: ready
  name: simple-app-2353-7986f76b6d-tsppg
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: simple-app-2353-7986f76b6d
spec:
  containers:
    image: ttl.sh/simple-app-2353:12h
    ports:
    - containerPort: 80
      name: http-app
  runtimeClassName: wasmtime-spin-v2
```

### List and Explore the Service managed by Spin Operator

```bash
# List services in the default namespace
kubectl get services

NAME              TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
simple-app-2353   ClusterIP   10.43.124.185   <none>        80/TCP    8m
```

```bash
# Explore the service
kubectl get service simple-app-2353 -o yaml

# YAML reduced to most interesting parts
kind: Service
metadata:
  name: simple-app-2353
  ownerReferences:
  - apiVersion: core.spinoperator.dev/v1alpha1
    blockOwnerDeletion: true
    controller: true
    kind: SpinApp
    name: simple-app-2353
spec:
  ports:
  - port: 80
    targetPort: http-app
  selector:
    core.spinoperator.dev/app.simple-app-2353.status: ready
  type: ClusterIP
```

Additionally, you can list all endpoints of the `simple-app-2353` service:

```bash
# List endpoints of the simple-app-2353 service
kubectl get endpoints simple-app-2353

# YAML reduced to most interesting parts
kind: Endpoints
metadata:
  labels:
    core.spinoperator.dev/app-name: simple-app-2353
  name: simple-app-2353
subsets:
- addresses:
  - ip: 10.42.0.150
  - ip: 10.42.0.151
  - ip: 10.42.1.181
  - ip: 10.42.1.182
  - ip: 10.42.2.21
  ports:
  - port: 80
    protocol: TCP
```
