import { Router } from '@fermyon/spin-sdk'

const hello = () => {
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Hello from SpinKube' })
  }
}

const helloYou = (name) => {
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: `Hello, ${name}! This is SpinKube!` })
  }
}

const router = Router()
router.get('/', hello)
router.get('/:name', ({ params }) => helloYou(params.name))

export async function handleRequest(req) {
  return await router.handleRequest(req)
}
