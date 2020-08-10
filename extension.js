'use strict'

const vscode = require('vscode')
const PHPCBF = require('./Phpcbf')
const { PHPCBF_VSCODE_COMMAND } = require('./config')

const { commands, workspace, window, languages, Range, Position } = vscode

const outputChannel = window.createOutputChannel('phpcbf')

function print (level = 'LOG', message) {
  outputChannel.appendLine(`PHPCBF: ${level} ${message}`)
}

const phpcbf = new PHPCBF({
  ...getPHPCBFConfiguration(),
  onError: message => {
    print('ERROR', message)
    window.showErrorMessage(message)
  },
  onDebug: message => {
    print('DEBUG', message)
  }
})

/**
 * Get PHPCBF configuration
 *
 * @returns {object}
 * */
function getPHPCBFConfiguration (options = {}) {
  const documentURI = window.activeTextEditor
    ? window.activeTextEditor.document.uri
    : ''

  const config = workspace.getConfiguration('phpcbf', documentURI)

  const payload = {
    debug: config.get('debug', false),
    documentFormattingProvider: config.get('documentFormattingProvider', true),
    standard: config.get('standard', null),
    enable: config.get('enable'),
    onsave: config.get('onsave'),
    executablePath: config.get(
      'executablePath',
      process.platform === 'win32' ? 'php-cbf.bat' : 'phpcbf'
    ),
    configSearch: config.get('configSearch', false)
  }

  if (documentURI) {
    const workspaceFolder = workspace.getWorkspaceFolder(documentURI)
    payload.workspace = workspaceFolder
      ? workspaceFolder.uri.fsPath
      : documentURI.fsPath
  }

  return { ...options, ...payload }
}

/**
 * Check if current document is a php file
 *
 * @param {object} payload the event provided
 * @returns {boolean}
 * */
function isPhp (payload) {
  return payload.document.languageId === 'php'
}

/**
 * Check if format on save is enables
 * in the vscode settings
 *
 * @returns {boolean}
 * */
function isFormatOnSaveEnabled () {
  const editor = window.activeTextEditor
  return (
    workspace
      .getConfiguration('editor', editor.document.uri)
      .get('formatOnSave') === true
  )
}

/**
 * Event handler when saving document
 *
 * @param {object} event
 * */
function onWillSaveTextDocument (event) {
  if (isPhp(event) && !isFormatOnSaveEnabled() && phpcbf.onsave) {
    event.waitUntil(commands.executeCommand('editor.action.formatDocument'))
  }
}

/**
 * Event handler when a command is registered
 *
 * @param {object} event
 * */
function registerTextEditorCommand (event) {
  if (isPhp(event)) {
    commands.executeCommand('editor.action.formatDocument')
  }
}

/**
 * Event handler when vscode configuration changes
 * */
function onDidChangeConfiguration () {
  const options = phpcbf.getOptions()
  phpcbf.setOptions(getPHPCBFConfiguration(options))
}

/**
 * Event handler when formatting
 *
 * @param {object} document
 * @return {any}
 * */
async function provideDocumentFormattingEdits (document) {
  // If phpcbf is disabled stop the execution
  if (!phpcbf.enable) {
    return
  }

  const originalText = document.getText()
  const lastLine = document.lineAt(document.lineCount - 1)
  const range = new Range(new Position(0, 0), lastLine.range.end)

  try {
    phpcbf.setStandard(document.uri.fsPath)
  } catch (err) {
    print('ERROR', err.message)
    return false
  }

  try {
    const fixedText = await phpcbf.format(originalText)
    if (fixedText !== '' && fixedText !== originalText) {
      return [new vscode.TextEdit(range, fixedText)]
    }
  } catch (err) {
    print('ERROR', err.message)
    window.showErrorMessage(err.message)
    return false
  }
}

// EXPORT
exports.activate = context => {
  // 1. Add handler on saving
  context.subscriptions.push(
    workspace.onWillSaveTextDocument(onWillSaveTextDocument)
  )

  // 2. Register command
  context.subscriptions.push(
    commands.registerTextEditorCommand(
      PHPCBF_VSCODE_COMMAND,
      registerTextEditorCommand
    )
  )

  // 3. Add handler when configuration change
  context.subscriptions.push(
    workspace.onDidChangeConfiguration(onDidChangeConfiguration)
  )

  // 4. Handler on formatting
  if (phpcbf.documentFormattingProvider) {
    context.subscriptions.push(
      languages.registerDocumentFormattingEditProvider('php', {
        provideDocumentFormattingEdits
      })
    )
  }
}
