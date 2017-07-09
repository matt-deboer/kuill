let kinds = {
  workloads: {
    Deployment: {
      base: 'apis/apps/v1beta1', 
      plural: 'deployments',
      hasLogs: true,
      hasTerminal: true,
      getData: ({status, spec, metadata }) => {
        return [{
          name: '',
          data : [
            ['Replicas:',`${status.availableReplicas} available, ${status.readyReplicas} ready, ${status.updatedReplicas} updated, ${status.replicas} total`],
            ['Update Strategy:', spec.strategy.type],
          ],
        }]
      },
      image: 'deployment.png',
      abbrev: 'De',
    },
    DaemonSet: {
      base: 'apis/extensions/v1beta1',
      plural: 'daemonsets',
      hasLogs: true,
      hasTerminal: true,
      getData: ({status, spec, metadata }) => {
        return [{
          name: '',
          data: [
            ['Replicas',`${status.availableReplicas} available, ${status.readyReplicas} ready, ${status.updatedReplicas} updated, ${status.replicas} total`],
            ['Update Strategy', spec.updateStrategy.type],
          ],
        }]
      },
      image: 'daemonset.png',
      abbrev: 'Ds',
    },
    StatefulSet: {
      base: 'apis/apps/v1beta1',
      plural: 'statefulsets',
      abbrev: 'Ss',
      hasLogs: true,
      hasTerminal: true,
    },
    ReplicaSet: {
      base: 'apis/extensions/v1beta1',
      plural: 'replicasets',
      getData: ({status, spec, metadata}) => {
        return [{
          name: '',
          data: [
            ['Replicas',`${status.availableReplicas} available, ${status.readyReplicas} ready, ${status.fullyLabeledReplicas} labeled, ${status.replicas} total`],
            ['Label Selector', Object.entries(spec.selector.matchLabels).map(([key, val])=>`${key}=${val}`).join(', ')],
          ],
        }]
      },
      image: 'replicaset.png',
      abbrev: 'Rs',
      hasLogs: true,
      hasTerminal: true,
    },
    ReplicationController: {
      base: 'api/v1',
      plural: 'replicationcontrollers',
      image: 'replicationcontroller.png',
      getData: ({status, spec, metadata }) => {
        return [
          {data: [
            ['Replicas',`${status.availableReplicas} available, ${status.readyReplicas} ready,  ${status.fullyLabeledReplicas} labeled, ${status.replicas} total`],
          ]},
        ]
      },
      abbrev: 'Rc',
      hasLogs: true,
      hasTerminal: true,
    },
    Job: {
      base: 'apis/batch/v1',
      plural: 'jobs',
      image: 'job.png',
      abbrev: 'Jb',
      hasLogs: true,
      hasTerminal: true,
    },
    CronJob: {
      base: 'apis/batch/v2alpha1',
      plural: 'cronjobs',
      abbrev: 'Cj',
      hasLogs: true,
      hasTerminal: true,
    },
    Pod: {
      base: 'api/v1',
      plural: 'pods',
      image: 'pod.png',
      getData: ({status, spec, metadata }) => {
        let containers = []
        for (let c of spec.containers) {
          containers.push(['',
            {data: [
              ['Name:', c.name],
              ['Image:', c.image],
              ['Pull Policy:', c.imagePullPolicy],
              ['Ports: ', (c.ports ? c.ports.map(port=>`${port.containerPort}:${port.name}:${port.protocol}`).join(', '): '')],
            ]}
          ])
        }

        return [{
          name: '',
          data: [
            ['Status:', status.phase],
            ['Pod IP:',status.podIP],
            ['Host IP:', status.hostIP],
          ]
        },
        {
          name: 'containers',
          data: containers,
        }]
      },
      abbrev: 'Po',
      hasLogs: true,
      hasTerminal: true,
    },
    Service: {
      base: 'api/v1',
      plural: 'services',
      abbrev: 'Sv',
    },
    Endpoints: {
      base: 'api/v1',
      plural: 'endpoints',
      abbrev: 'Ep',
    },
    Ingress: {
      base: 'apis/extensions/v1beta1',
      plural: 'ingresses',
      abbrev: 'Ig',
    },
    ConfigMap: {
      base: 'api/v1',
      plural: 'configmaps',
      abbrev: 'Cm',
    },
    Secret: {
      base: 'api/v1',
      plural: 'secrets',
      abbrev: 'Se',
    }
  },
  cluster: {
    Node: {
      base: 'api/v1',
      plural: 'nodes',
      abbrev: 'No',
    },
    PersistentVolume: {
      base: 'api/v1',
      plural: 'persistentvolumes',
      abbrev: 'Pv',
    },
    ComponentStatus: {
      base: 'api/v1',
      plural: 'componentstatuses',
      abbrev: 'Cs',
    },
    Namespace: {
      base: 'api/v1',
      plural: 'namespaces',
      abbrev: 'Ns',
    },
    ResourceQuota: {
      base: 'api/v1',
      plural: 'resourcequotas',
      abbrev: 'Rq',
    },
  },
  access: {
    ServiceAccount: {
      base: 'api/v1',
      plural: 'serviceaccounts',
      abbrev: 'Sa',
    },
    Role: {
      base: 'apis/rbac.authorization.k8s.io/v1beta1',
      plural: 'roles',
      abbrev: 'Ro',
    },
    RoleBinding: {
      base: 'apis/rbac.authorization.k8s.io/v1beta1',
      plural: 'rolebindings',
      abbrev: 'Rb',
    },
    ClusterRole: {
      base: 'apis/rbac.authorization.k8s.io/v1beta1',
      plural: 'clusterroles',
      abbrev: 'Cr',
    },
    ClusterRoleBinding: {
      base: 'apis/rbac.authorization.k8s.io/v1beta1',
      plural: 'clusterrolebindings',
      abbrev: 'Cb',
    },
    NetworkPolicy: {
      base: 'apis/extensions/v1beta1',
      plural: 'networkpolicies',
      abbrev: 'Np',
    },
  },
}

export default kinds