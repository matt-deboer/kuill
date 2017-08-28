import React from 'react'
import { Link } from 'react-router-dom'
import { linkForResource } from '../../routes'
import { toHumanizedAge } from '../../converters'

let kinds = {
  Deployment: {
    getData: ({status, spec, metadata }) => {
      return [
        ['Replicas:', (status.availableReplicas ? status.availableReplicas + ' available, ': '') +
          (status.readyReplicas ? status.readyReplicas + ' ready, ':'') +
          (status.updatedReplicas ? status.updatedReplicas + ' updated, ':'') +
          (status.unavailableReplicas ? status.unavailableReplicas + ' unavailable, ':'') +
          (status.replicas || 0) + ' desired'],
        ['Created:', `${metadata.creationTimestamp} (${toHumanizedAge(metadata.creationTimestamp)} ago)`],
        ['Update Strategy:', spec.strategy.type],
      ]
    },
  },
  DaemonSet: {
    getData: ({status, spec, metadata }) => {
      return [
        ['Instances',`${status.desiredNumberScheduled || 0} desired, ${status.currentNumberScheduled} scheduled, 
          ${status.numberAvailable} available, ${status.numberReady} ready, 
          ${status.updatedNumberScheduled} updated, ${status.numberMisscheduled} misscheduled`],
        ['Created:', `${metadata.creationTimestamp} (${toHumanizedAge(metadata.creationTimestamp)} ago)`],
        ['Selector', `${spec.selector.matchLabels ? Object.entries(spec.selector.matchLabels).map(e=>e[0]+'='+e[1]).join(', '): ''}`],
        ['Update Strategy', spec.updateStrategy.type],
      ]
    },
  },
  StatefulSet: {
    getData: ({status, spec, metadata}) => {
      return [
        ['Replicas',`${status.replicas || 0} current, ${spec.replicas || 0} desired`],
        ['Created:', `${metadata.creationTimestamp} (${toHumanizedAge(metadata.creationTimestamp)} ago)`],
      ]
    },
  },
  ReplicaSet: {
    getData: ({status, spec, metadata}) => {
      return [
        ['Replicas',`${status.availableReplicas} available, ${status.readyReplicas} ready, ${status.fullyLabeledReplicas} labeled, ${status.replicas} total`],
        ['Created:', `${metadata.creationTimestamp} (${toHumanizedAge(metadata.creationTimestamp)} ago)`],
        ['Label Selector', spec.selector.matchLabels],
      ]
    },
  },
  ReplicationController: {
    getData: ({status, spec, metadata }) => {
      return [
        ['Replicas',`${status.availableReplicas} available, ${status.readyReplicas} ready,  ${status.fullyLabeledReplicas} labeled, ${status.replicas} total`],
        ['Created:', `${metadata.creationTimestamp} (${toHumanizedAge(metadata.creationTimestamp)} ago)`],
      ]
    },
  },
  Job: {
    getData: ({status, spec, metadata }) => {
      return [
        ['Created:', `${metadata.creationTimestamp} (${toHumanizedAge(metadata.creationTimestamp)} ago)`],
      ]
    },
  },
  CronJob: {
    getData: ({status, spec, metadata }) => {
      return [
        ['Created:', `${metadata.creationTimestamp} (${toHumanizedAge(metadata.creationTimestamp)} ago)`],
        ['Schedule:', spec.schedule],
        ['Concurrency Policy:', spec.concurrencyPolicy],
        ['Suspend', spec.suspend],
        // ['Starting Deadline Seconds:', spec.startingDeadlineSeconds || '<unset>'],
        ['Selector:', spec.nodeSelector || '<none>'],
        ['Parallelism:', spec.parallelism || '<unset>'],
        ['Last Schedule Time:', status.lastScheduleTime],
        //Completions:			<unset>
      ]
    },
  },
  Pod: {
    getData: ({status, spec, metadata }) => {
      return [
      ]
    },
  },
  Service: {
    getData: ({status, spec, metadata }) => {
      return [
        ['Created:', `${metadata.creationTimestamp} (${toHumanizedAge(metadata.creationTimestamp)} ago)`],
        ['Type:', spec.type],
        ['IP:', spec.clusterIP],
        ['Port:', spec.ports[0].port],
        ['NodePort:', spec.ports[0].nodePort || 'n/a'],
        ['Session Affinity:', spec.sessionAffinity],
      ]
    },
  },
  Endpoints: {
    getData: ({status, spec, metadata }) => {
      return [
        ['Created:', `${metadata.creationTimestamp} (${toHumanizedAge(metadata.creationTimestamp)} ago)`],
      ]
    },
  },
  Ingress: {
    getData: ({status, spec, metadata }) => {
      let lbs = []
      if (status.loadBalancer.ingress && status.loadBalancer.ingress.length) {
        for (let ig of status.loadBalancer.ingress) {
          if (ig.hostname) {
            lbs.push(ig.hostname)
          } else if (ig.ip) {
            lbs.push(ig.ip)
          }
        }
      }
      return [
        ['Created:', `${metadata.creationTimestamp} (${toHumanizedAge(metadata.creationTimestamp)} ago)`],
        ['Rules:', spec.rules],
        ['Load Balancers:', lbs.length > 0 ? lbs.join(', ') : '< none >'],
      ]
    },
  },
  ConfigMap: {
    getData: (resource) => {
      return [
        ['Created:', `${resource.metadata.creationTimestamp} (${toHumanizedAge(resource.metadata.creationTimestamp)} ago)`],
      ]
    },
  },
  Secret: {
    getData: (resource) => {
      return [
        ['Created:', `${resource.metadata.creationTimestamp} (${toHumanizedAge(resource.metadata.creationTimestamp)} ago)`],
      ]
    },
  },
  PersistentVolume: {
    getData: ({status, spec, metadata }) => {
      return [
          ['Status:', status.phase],
          ['Created:', `${metadata.creationTimestamp} (${toHumanizedAge(metadata.creationTimestamp)} ago)`],
          ['Claim:', spec.claimRef ? 
            <Link to={linkForResource(`PersistentVolumeClaim/${spec.claimRef.namespace}/${spec.claimRef.name}`)}>
              {spec.claimRef.namespace + '/' + spec.claimRef.name}
            </Link>: null
          ],
          ['Reclaim Policy:', spec.persistentVolumeReclaimPolicy],
          ['Access Modes:', `${spec.accessModes.join(', ')}`],
          ['Capacity:', spec.capacity.storage],
        ]
    },
  },
  PersistentVolumeClaim: {
    getData: ({status, spec, metadata }) => {
      return [
        ['Status:', status.phase],
        ['Created:', `${metadata.creationTimestamp} (${toHumanizedAge(metadata.creationTimestamp)} ago)`],
        ['Volume:', spec.volumeName],
        ['Capacity:', `${status.phase === 'Bound' ? status.capacity.storage : 0} bound / ${spec.resources.requests.storage} requested`],
        ['Access Modes:', `${spec.accessModes.join(', ')}`],
      ]
    },
  },
  Node: {
    getData: (resource) => {
      let data = []
      for (let addr of resource.status.addresses) {
        data.push([addr.type, addr.address])
      }
      data.push(["CPU", resource.status.allocatable.cpu])
      data.push(["Mem", resource.status.allocatable.memory])
      data.push(["OS", resource.status.nodeInfo.operatingSystem])
      data.push(["OS Image", resource.status.nodeInfo.osImage])
      data.push(["Kernel Version", resource.status.nodeInfo.kernelVersion])
      data.push(["Architecture", resource.status.nodeInfo.architecture])
      data.push(["Container Runtime", resource.status.nodeInfo.containerRuntimeVersion])
      data.push(["KubeProxy Version", resource.status.nodeInfo.kubeProxyVersion])
      data.push(["Kubelet Version", resource.status.nodeInfo.kubeletVersion])
      data.push(["Boot ID", resource.status.nodeInfo.bootID])
      data.push(["Machine ID", resource.status.nodeInfo.machineID])
      data.push(["System UUID", resource.status.nodeInfo.systemUUID])
      return data
    },
  },
  StorageClass: {
    getData: (resource) => {
      return [
        ['Created:', `${resource.metadata.creationTimestamp} (${toHumanizedAge(resource.metadata.creationTimestamp)} ago)`],  
        ['Parameters:', `${resource.parameters ? Object.entries(resource.parameters).map(([key,val])=> key + '=' + val).join(', ') : ''}`],
        ['Provisioner:', resource.provisioner],
      ]
    },
  },
  ComponentStatus: {
  },
  Namespace: {
  },
  ResourceQuota: {
  },
  ServiceAccount: {
  },
  Role: {
  },
  RoleBinding: {
  },
  ClusterRole: {
  },
  ClusterRoleBinding: {
  },
  NetworkPolicy: {
  },
}

export default kinds