import { Context, Dict, Schema } from 'koishi'
import { OpenAI } from 'openai'

export const name = 'why-not-ask-gpt'

export interface Config {
  apikey: string,
  commands: Dict<string>,
}

export const Config: Schema<Config> = Schema.object({
  apikey: Schema.string().required().description('OpenAI API Key (GPT-3.5-Turbo)'),
  commands: Schema.dict(String).role('table')
})

async function askGPT(openai: OpenAI, info: string) {
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'system', content: info }],
    model: 'gpt-3.5-turbo',
  })
  const response = completion.choices
  return response
}

export function apply(ctx: Context, config: Config) {
  const openai = new OpenAI({ apiKey: config.apikey })
  let root = ctx.$commander
  ctx.i18n.define('zh-CN', require('./zh'))
  let cmds = ''
  for (const [key, value] of Object.entries(config.commands)) {
    cmds += `${key} - ${value}\n`
  }
  ctx.command("ask <info:text>")
    .action(async ({ session }, info) => {
      const ask = `我将在一个聊天程序的机器人提供的指令中选择一个指令来满足我的需求，这是这个机器人所提供的所有指令列表：
                  ${cmds}
                  你需要通过我接下来的描述为我选择一个指令并直接回复整个指令，不要有多余的话，有如果可以填入选项的填入选项
                  ${info}`
      session.send(ask)
      const answer = await askGPT(openai, ask)
      // session.send(answer[0].message.content)
      session.execute(answer[0].message.content)
  })
}
