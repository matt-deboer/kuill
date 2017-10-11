// TODO can we build this up from API requests?


let kinds = {
  workloads: {
    Deployment: {
      base: 'apis/apps/v1beta1', 
      plural: 'deployments',
      hasLogs: true,
      hasTerminal: true,
      hasScale: true,
      image: 'deployment.png',
      abbrev: 'De',
    },
    DaemonSet: {
      base: 'apis/extensions/v1beta1',
      plural: 'daemonsets',
      hasLogs: true,
      hasTerminal: true,
      image: 'daemonset.png',
      abbrev: 'Ds',
    },
    StatefulSet: {
      base: 'apis/apps/v1beta1',
      plural: 'statefulsets',
      abbrev: 'Ss',
      hasLogs: true,
      hasTerminal: true,
      hasScale: true,
    },
    ReplicaSet: {
      base: 'apis/extensions/v1beta1',
      plural: 'replicasets',
      image: 'replicaset.png',
      abbrev: 'Rs',
      hasLogs: true,
      hasTerminal: true,
      hasScale: true,
    },
    ReplicationController: {
      base: 'api/v1',
      plural: 'replicationcontrollers',
      image: 'replicationcontroller.png',
      abbrev: 'Rc',
      hasLogs: true,
      hasTerminal: true,
      hasScale: true,
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
      editable: false,
      deletable: false,
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
    },
    PersistentVolumeClaim: {
      base: 'api/v1',
      plural: 'persistentvolumeclaims',
      abbrev: 'Pc',
    },
  },
  cluster: {
    Node: {
      base: 'api/v1',
      plural: 'nodes',
      abbrev: 'No',
      editable: false,
      deletable: false,
    },
    PersistentVolume: {
      base: 'api/v1',
      plural: 'persistentvolumes',
      abbrev: 'Pv',
    },
    StorageClass: {
      base: 'apis/storage.k8s.io/v1',
      plural: 'storageclasses',
      abbrev: 'Sc',
      watchable: false,
    },
    // ComponentStatus: {
    //   base: 'api/v1',
    //   plural: 'componentstatuses',
    //   abbrev: 'Cs',
    // },
    Namespace: {
      base: 'api/v1',
      plural: 'namespaces',
      abbrev: 'Ns',
      watchable: false,
    },
    ResourceQuota: {
      base: 'api/v1',
      plural: 'resourcequotas',
      abbrev: 'Rq',
    },
    ThirdPartyResource: {
      base: 'apis/extensions/v1beta1',
      plural: 'thirdpartyresources',
      abbrev: 'Tr',
    }
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