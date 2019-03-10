import {Command, flags} from '@oclif/command'
import * as fs from 'fs'
import * as puppeteer from 'puppeteer'
import * as url from 'url'
const compareImages = require('resemblejs/compareImages')

class PuppeteerPixelmatch extends Command {
  static description = 'describe the command here'

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    // flag with a value (-s, --source=VALUE)
    source: flags.string({char: 's', description: 'compare source', required: true}),
    // flag with a value (-t, --target=VALUE)
    target: flags.string({char: 't', description: 'compare target', required: true}),
  }

  static args = [{
    name: 'pathsArray',
    required: true
  }]

  async run() {
    const {args, flags} = this.parse(PuppeteerPixelmatch)

    const source = flags.source
    // tslint:disable-next-line no-http-string
    const target = flags.target
    const pathsArrayPath = args.pathsArray
    const pathsArray = JSON.parse(await fs.promises.readFile(pathsArrayPath, 'utf8'))

    for (let index = 0; index < pathsArray.length; index++) {
      const path = pathsArray[index]

      this.log(`${index + 1}/${pathsArray.length}`)

      // スクリーンショットを作成
      const sourceUrl = new URL(path, source)
      const targetUrl = new URL(path, target)
      const sourceScreenshot = await this.screenshot(sourceUrl)
      const targetScreenshot = await this.screenshot(targetUrl)

      // 実行しているパスにフォルダーを作成し保存
      await fs.promises.mkdir(`${this.compatibleUrl(sourceUrl.host)}`, {
        recursive: true
      })
      await fs.promises.mkdir(`${this.compatibleUrl(targetUrl.host)}`, {
        recursive: true
      })
      await fs.promises.writeFile(`${this.compatibleUrl(sourceUrl.host)}/${this.compatibleUrl(sourceUrl.pathname)}.png`, sourceScreenshot)
      await fs.promises.writeFile(`${this.compatibleUrl(targetUrl.host)}/${this.compatibleUrl(targetUrl.pathname)}.png`, targetScreenshot)

      // SourceとTargetを比較
      const diff = await compareImages(
        sourceScreenshot,
        targetScreenshot
      )
      const diffScreenshot = diff.getBuffer()

      // 実行しているパスにフォルダーを作成し保存
      await fs.promises.mkdir('diff', {
        recursive: true
      })
      await fs.promises.writeFile(`diff/${this.compatibleUrl(sourceUrl.pathname)}.png`, diffScreenshot)
    }
  }

  async screenshot(url: url.URL) {
    const browser = await puppeteer.launch()

    const page = await browser.newPage()
    await page.goto(url.toString())

    const screenshot = await page.screenshot({
      fullPage: true
    })

    await browser.close()

    return screenshot
  }

  compatibleUrl(url: string) {
    return url.replace(/\W/g, '_')
  }
}

export = PuppeteerPixelmatch
