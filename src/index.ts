import { Context, Schema } from 'koishi'
import { OpenAI } from 'openai'

export const name = 'why-not-ask-gpt'

export interface Config {
  apikey: string
}

export const Config: Schema<Config> = Schema.object({
  apikey: Schema.string().required(),
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
  ctx.command("ask <info>")
    .action(async ({ session }, info) => {
      const ask = `我将在一个聊天程序的机器人提供的指令中选择一个指令来满足我的需求，这是这个机器人所提供的所有指令列表：
                  help - 显示所有帮助信息
                  weather - 查询天气
                  ask - 问一个问题
                  你需要通过我接下来的描述为我选择一个指令并必须以"指令:<指令>"的格式答复
                  ${info}`
      const answer = await askGPT(openai, ask)
      const cmd = answer[0].message.content.split(':')[1];
      return cmd
  })
}
