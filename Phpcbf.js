const path = require('path')
const fs = require('fs')
const os = require('os')
const cp = require('child_process')
const TmpDir = os.tmpdir()

const { PHPCBF_CONFIG_FILENAMES, PHPCBF_ERRORS } = require('./config')

// Errors
const {
  ERR_ON_CREATING_TEMP_FILE,
  ERR_ON_DELETING_TEMP_FILE,
  ERR_ZERO_FIXING_CONTENT_LENGTH,
  ERR_PHPCBF_EXIT_CODE_3,
  ERR_PHPCBF_EXIT_CODE_16,
  ERR_PHPCBF_EXIT_CODE_32,
  ERR_PHPCBF_EXIT_CODE_64,
  ERR_PHPCBF_EXIT_CODE_UNDEFINED,
  ERR_PHPCBF_ENOENT
} = PHPCBF_ERRORS

/**
 * PHPCBF Class
 * */
class PHPCBF {
  constructor (options = {}) {
    const fakeCallBack = () => true
    this.onError = options.onError || fakeCallBack
    this.onDebug = options.onDebug || fakeCallBack
    this.setOptions(options)
  }

  /**
   * Set options to use
   *
   * @param {object} options
   * */
  setOptions (options = {}) {
    this.configFilenames = options.config_filenames || PHPCBF_CONFIG_FILENAMES

    if (options.enable !== true) {
      return
    }

    this.onsave = options.onsave
    this.executablePath = options.executablePath
    this.configSearch = options.configSearch

    if (this.executablePath.startsWith('{{workspaceFolder}}')) {
      this.executablePath = this.executablePath.replace(
        /{{workspaceFolder}}/,
        options.workspace
      )
    }

    if (this.executablePath.startsWith('~')) {
      this.executablePath = this.executablePath.replace(
        /^~\//,
        os.homedir() + '/'
      )
    }

    this.standard = options.standard

    this.documentFormattingProvider = options.documentFormattingProvider

    this.debug = options.debug
  }

  /**
   * Concatenate arguments to use
   * for execute phpcbf binary
   *
   * @param {string} fileName
   * @returns {Array <string>}
   * */
  concatExecutableArguments (fileName) {
    const args = [
      this.debug ? '-l' : '-lq',
      fileName,
      this.standard ? `--standard=${this.standard}` : ''
    ]

    return args
  }

  /**
   * Set standard
   *
   * @param {string} documentURI The current file
   * */
  setStandard (documentURI) {
    if (!documentURI) return false
    if (!this.configSearch) return false

    // If configSearch attribute is set to true,
    // standard used by phpcbf will be replaced by custom config file
    // found
    const configFile = this.searchConfigFiles(documentURI)

    this.standard = configFile || this.standard
  }

  /**
   * Search for custom fixers files.
   * This method start scanning from the current file folder to root folder
   * If an allowed configuration file is found, it return the configuration file
   * path
   *
   * @param {string} documentURI The current file
   * @returns {string} the configuration file path
   * */
  searchConfigFiles (documentURI) {
    const folders = documentURI.split(path.sep)
    folders.pop()

    while (folders.length) {
      const currentFolder = folders.join(path.sep)
      let matchs = []
      try {
        matchs = fs.readdirSync(currentFolder).filter(a => {
          return this.configFilenames.indexOf(a) >= 0
        })
      } catch (e) {
        /* handle error */
      }

      if (matchs.length > 0) {
        return path.join(currentFolder, matchs[0])
      }

      folders.pop()
    }

    return ''
  }

  /**
   * Create temp file
   *
   * @param {string} content
   * @returns {string} the output file path
   * */
  createTempFile (content = '') {
    const randomHash = Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, '')
      .substr(0, 10)

    const fileName = `${TmpDir}/temp-${randomHash}.php`

    try {
      fs.writeFileSync(fileName, content)
    } catch (e) {
      throw new Error(ERR_ON_CREATING_TEMP_FILE)
    }

    return fileName
  }

  /**
   * Format the document
   *
   * @param {string} text
   * @returns {Promise <string>}
   * */
  async format (text) {
    // Save content of the document
    // into a temp file. Then phpcbf
    // will work on this file
    let fileName
    try {
      fileName = this.createTempFile(text)
    } catch (e) {
      throw new Error(e.message)
    }

    // Get executable arguments
    const execArguments = this.concatExecutableArguments(fileName)

    // In debug mode print the command
    if (this.debug) {
      this.onDebug(`${this.executablePath} ${execArguments}`)
    }

    // Spawn PHPCBF instance
    const exec = cp.spawn(this.executablePath, execArguments)

    const promise = new Promise((resolve, reject) => {
      exec.on('error', err => {
        return reject(err.code === 'ENOENT' ? ERR_PHPCBF_ENOENT : err)
      })

      exec.on('exit', code => {
        let fixedText = ''
        switch (code) {
          case 0:
            resolve(fixedText)
            break
          case 1:
          case 2:
            fixedText = fs.readFileSync(fileName, 'utf-8')
            if (fixedText.length === 0) {
              reject(ERR_ZERO_FIXING_CONTENT_LENGTH)
            } else {
              resolve(fixedText)
            }
            break
          case 3:
            reject(ERR_PHPCBF_EXIT_CODE_3)
            break
          case 16:
            reject(ERR_PHPCBF_EXIT_CODE_16)
            break
          case 32:
            reject(ERR_PHPCBF_EXIT_CODE_32)
            break
          case 64:
            reject(ERR_PHPCBF_EXIT_CODE_64)
            break
          default:
            reject(ERR_PHPCBF_EXIT_CODE_UNDEFINED)
            break
        }

        // Remove temp file
        fs.unlink(fileName, function (err) {
          if (err) {
            return reject(ERR_ON_DELETING_TEMP_FILE)
          }
        })
      })
    })

    if (this.debug) {
      exec.stdout.on('data', buffer => {
        this.onError(`[stdout] ${buffer.toString()}`)
      })
      exec.stderr.on('data', buffer => {
        this.onDebug(`[stderr] ${buffer.toString()}`)
      })
    }

    return promise
  }
}

module.exports = PHPCBF
