#!/bin/bash

# install kubectl
curl -LO https://storage.googleapis.com/kubernetes-release/release/v1.7.5/bin/linux/amd64/kubectl
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# install minikube
curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
chmod +x minikube && sudo mv minikube /usr/local/bin/

# install docker-machine-driver-kvm
curl -Lo docker-machine-driver-kvm https://github.com/dhiltgen/docker-machine-kvm/releases/download/v0.10.0/docker-machine-driver-kvm-ubuntu14.04
chmod +x docker-machine-driver-kvm && sudo mv docker-machine-driver-kvm /usr/local/bin/

# add current user to the libvirtd group
sudo usermod -a -G libvirtd $(whoami)
