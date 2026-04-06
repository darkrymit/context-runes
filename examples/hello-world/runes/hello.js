export async function generate(_dir, _args, utils, _opts) {
  return utils.section('hello', {
    type: 'markdown',
    content: 'Hello, World!',
  })
}
