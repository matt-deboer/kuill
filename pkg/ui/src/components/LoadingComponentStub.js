import React from 'react'
import LoadingSpinner from './LoadingSpinner'

export default function LoadingComponentStub({isLoading, error}) {
  if (isLoading) {
    return <LoadingSpinner isLoading={true}/>
  } else if (error) {
    // TODO: clean this up a bit and add consistent styling
    return <div>Sorry, there was a problem loading the page.</div>
  } else {
    return null
  }
}