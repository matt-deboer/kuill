export const defaultFetchParams = {
  credentials: 'same-origin',
  timeout: 5000,
}

export async function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}