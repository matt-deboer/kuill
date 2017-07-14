let kinds = {
  workloads: {
    Deployment: {
      base: 'apis/apps/v1beta1', 
      plural: 'deployments',
      hasLogs: true,
      hasTerminal: true,
      getData: ({status, spec, metadata }) => {
        return [
          ['Replicas:',`${status.availableReplicas ? status.availableReplicas + ' available, ': ''}
            ${status.readyReplicas ? status.readyReplicas + ' ready, ':''}
            ${status.updatedReplicas ? status.updatedReplicas + ' updated, ':''}
            ${status.unavailableReplicas ? status.unavailableReplicas + ' unavailable, ':''}
            ${status.replicas} desired`],
          ['Update Strategy:', spec.strategy.type],
        ]
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
        return [
          ['Selector', `${spec.selector.matchLabels ? Object.entries(spec.selector.matchLabels).map(e=>e[0]+'='+e[1]).join(', '): ''}`],
          ['Instances',`${status.desiredNumberScheduled} desired, ${status.currentNumberScheduled} scheduled, 
            ${status.numberAvailable} available, ${status.numberReady} ready, 
            ${status.updatedNumberScheduled} updated, ${status.numberMisscheduled} misscheduled`],
          ['Update Strategy', spec.updateStrategy.type],
        ]
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
      getData: ({status, spec, metadata}) => {
        return [
          ['Replicas',`${status.replicas} current, ${spec.replicas} desired`],
        ]
      },
    },
    ReplicaSet: {
      base: 'apis/extensions/v1beta1',
      plural: 'replicasets',
      getData: ({status, spec, metadata}) => {
        return [
          ['Replicas',`${status.availableReplicas} available, ${status.readyReplicas} ready, ${status.fullyLabeledReplicas} labeled, ${status.replicas} total`],
          // ['Pods Status',`${status.availableReplicas} available, ${status.readyReplicas} ready, ${status.fullyLabeledReplicas} labeled, ${status.replicas} total`],
          ['Label Selector', Object.entries(spec.selector.matchLabels).map(([key, val])=>`${key}=${val}`).join(', ')],
        ]
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
          ['Replicas',`${status.availableReplicas} available, ${status.readyReplicas} ready,  ${status.fullyLabeledReplicas} labeled, ${status.replicas} total`],
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
        return [
            ['Node:', spec.nodeName],
            ['Start Time:', status.startTime],
            ['Status:', status.phase],
            ['Pod IP:',status.podIP],
            ['Host IP:', status.hostIP],
            ['Conditions:', (status.conditions ? status.conditions.map(cond => `${cond.type}`).join(', '): '')],
            ['QoS Class:', status.qosClass],
            ['Node-Selectors:', spec.nodeSelector ? spec.nodeSelector : '< none >'],
          ]
      },
      abbrev: 'Po',
      hasLogs: true,
      hasTerminal: true,
    },
    Service: {
      base: 'api/v1',
      plural: 'services',
      abbrev: 'Sv',
      getData: ({status, spec, metadata }) => {
        return [
            ['Type:', spec.type],
            ['IP:', spec.clusterIP],
            ['Port:', spec.ports[0].port],
            ['NodePort:', spec.ports[0].nodePort || 'n/a'],
            ['Session Affinity:', spec.sessionAffinity],
          ]
      },
    },
    Endpoints: {
      base: 'api/v1',
      plural: 'endpoints',
      abbrev: 'Ep',
      // getData: ({status, spec, metadata }) => {
      //   return [{
      //     name: '',
      //     data: [
      //       ['Type:', spec.type],
      //       ['IP:', spec.clusterIP],
      //       ['Port:', spec.ports[0].port],
      //       ['NodePort:', spec.ports[0].nodePort || 'n/a'],
      //       ['Session Affinity:', spec.sessionAffinity],
      //     ]
      //   }]
      // },
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