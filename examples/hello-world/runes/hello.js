export async function generate(_dir, _args, utils) {
  return utils.section.create('hello', {
    type: 'markdown',
    content: 'Hello, World!',
  })
}
