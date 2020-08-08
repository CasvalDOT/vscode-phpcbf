const path = require('path')
const fs = require('fs')
const os = require('os')
const cp = require('child_process')
const TmpDir = os.tmpdir()

const {
  PHPCBF_CONFIG_FILENAMES,
  PHPCBF_ERRORS,
  PHPCBF_NO_FIXABLE_ERRORS
} = require('./config')

// Errors
const {
  ERR_ON_CREATING_TEMP_FILE,
  ERR_ON_DELETING_TEMP_FILE,
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
   * Resolve executable path
   *
   * @param {string} path
   * @returns {string}
   * */
  resolveExecutablePath (options) {
    let path = options.executablePath
    if (path.startsWith('{{workspaceFolder}}')) {
      path = path.replace(/{{workspaceFolder}}/, options.workspace)
    }

    if (path.startsWith('~')) {
      path = path.replace(/^~\//, os.homedir() + '/')
    }

    return path
  }

  /**
   * Set options to use
   *
   * @param {object} options
   * */
  setOptions (options = {}) {
    this.enable = options.enable
    this.configFilenames = options.config_filenames || PHPCBF_CONFIG_FILENAMES
    this.onsave = options.onsave
    this.executablePath = this.resolveExecutablePath(options)
    this.configSearch = options.configSearch
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
    return [
      this.debug ? '-l' : '-lq',
      fileName,
      this.standard ? `--standard=${this.standard}` : ''
    ]
  }

  /**
   * Set standard
   *
   * @param {string} documentURI The current file
   * */
  setStandard (documentURI) {
    if (!documentURI || !this.configSearch) return

    // If configSearch attribute is set to true,
    // standard used by phpcbf will be replaced by custom config file
    // found
    const configFile = this.searchConfigFiles(documentURI)

    if (configFile) this.standard = configFile
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

    // Remove latest element because
    // the file is not a folder
    folders.pop()

    while (folders.length) {
      const currentFolder = folders.join(path.sep)

      // Remove latest element
      folders.pop()

      // if current folder is empty skip it
      if (!currentFolder) continue

      let matchs = []
      try {
        matchs = fs.readdirSync(currentFolder).filter(a => {
          return this.configFilenames.indexOf(a) >= 0
        })
      } catch (e) {
        this.onError(`${currentFolder} - ${e.message}`)
        continue
      }

      if (matchs.length > 0) {
        return path.join(currentFolder, matchs[0])
      }
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
   * Execute the fix command
   *
   * @param {Array <string>} execArguments The argumnets uto use with the command
   * @returns {Promise <number>} The output code
   * */
  executeFormat (execArguments) {
    // In debug mode print the command
    if (this.debug) {
      this.onDebug(`${this.executablePath} ${execArguments}`)
    }

    // Spawn PHPCBF instance
    const exec = cp.spawn(this.executablePath, execArguments)

    // Exec process handler
    const promise = new Promise((resolve, reject) => {
      exec.on('error', err => {
        return reject(err.code === 'ENOENT' ? ERR_PHPCBF_ENOENT : err)
      })

      exec.on('exit', code => {
        switch (code) {
          // code 0 means no fixes found
          // Code 1 and 2 means some fix are applied
          case PHPCBF_NO_FIXABLE_ERRORS:
          case 1:
          case 2:
            return resolve(code)
          case 3:
            return reject(ERR_PHPCBF_EXIT_CODE_3)
          case 16:
            return reject(ERR_PHPCBF_EXIT_CODE_16)
          case 32:
            return reject(ERR_PHPCBF_EXIT_CODE_32)
          case 64:
            return reject(ERR_PHPCBF_EXIT_CODE_64)
          default:
            return reject(ERR_PHPCBF_EXIT_CODE_UNDEFINED)
        }
      })
    })

    if (this.debug) {
      exec.stdout.on('data', buffer => {
        this.onDebug(`[stdout] ${buffer.toString()}`)
      })
      exec.stderr.on('data', buffer => {
        this.onError(`[stderr] ${buffer.toString()}`)
      })
    }

    return promise
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
    const fileName = this.createTempFile(text)

    // Get executable arguments
    const execArguments = this.concatExecutableArguments(fileName)

    let outputText = ''
    try {
      const code = await this.executeFormat(execArguments)
      if (code > PHPCBF_NO_FIXABLE_ERRORS) {
        outputText = fs.readFileSync(fileName, 'utf-8')
      }
    } catch (e) {
      throw new Error(e.message)
    } finally {
      // Remove temp file
      fs.unlink(fileName, function (err) {
        if (err) {
          throw new Error(ERR_ON_DELETING_TEMP_FILE)
        }
      })
    }

    return outputText
  }
}

module.exports = PHPCBF
