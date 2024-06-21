# Introduction

Welcome to the [SpinKube](http://spinkube.dev) workshop!

We are thrilled to have you join this workshop on SpinKube, in which you'll discover how to run serverless WebAssembly workloads natively on your Kubernetes cluster. Although this is an instructure-led workshop, excercises are included to deepen your knowledge in the realm of SpinKube and to get some practical experience on your own pace.

Currently, there are four workshop modules:

1. Setting up SpinKube
2. Running Spin Apps on SpinKube
3. Integrating Spin Apps
4. Observability

There are checkpoint scripts (`checkpoint.sh`) available for each module, ensuring you can follow the workshop even in the case that you accidentially messed up excercises of a preceding module.

## Prerequisites

To follow along the samples shown in this workshop and the excercises provided, you should have the following software installed on your machine:

- Latest Spin CLI (`spin`)
- Kubernetes CLI (`kubectl`)
- Helm CLI (`helm`)
- K3D CLI (`k3d`)
- [Node.js](https://nodejs.org)
- [Docker](https://docker.com) or similar container runtime
- An editor (e.g. Visual Studio Code, Sublime Text, Notepad, Vim)

During the workshop, we will use `k3d` for managing a simple Kubernetes cluster on your local machine. Alternatively, you can use a cloud-hosted Kubernetes services such as:

- Azure Kubernetes Service (AKS)
- Google Kubernetes Engine (GKE)
- Amazon Elastic Kubernetes Service (EKS)
- DigitalOcean Kubernetes Service (DOKS)

## Useful Resources and Tools

- [The `kubectl` quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
- [k9s](https://k9scli.io/)
- [krew](https://krew.sigs.k8s.io/) - The `kubectl` plugin manager
  - [`kubctx`](https://github.com/ahmetb/kubectx) - Plugin to switch `kubectl` contexts with ease
- [The `helm` cheat sheet](https://helm.sh/docs/intro/cheatsheet/)
