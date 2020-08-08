'use strict'

const vscode = require('vscode')
const PHPCBF = require('./Phpcbf')
const { PHPCBF_VSCODE_COMMAND } = require('./config')

const { commands, workspace, window, languages, Range, Position } = vscode

const phpcbf = new PHPCBF(getPHPCBFConfiguration())

/**
 * Get PHPCBF configuration
 *
 * @returns {object}
 * */
function getPHPCBFConfiguration () {
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
    payload.workspace = workspace.getWorkspaceFolder(documentURI)
  }

  return payload
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
  phpcbf.setOptions(getPHPCBFConfiguration())
}

// EXPORT
exports.activate = context => {
  context.subscriptions.push(
    workspace.onWillSaveTextDocument(onWillSaveTextDocument)
  )

  context.subscriptions.push(
    commands.registerTextEditorCommand(
      PHPCBF_VSCODE_COMMAND,
      registerTextEditorCommand
    )
  )

  context.subscriptions.push(
    workspace.onDidChangeConfiguration(onDidChangeConfiguration)
  )

  if (phpcbf.documentFormattingProvider) {
    context.subscriptions.push(
      languages.registerDocumentFormattingEditProvider('php', {
        provideDocumentFormattingEdits: async document => {
          const originalText = document.getText()
          const lastLine = document.lineAt(document.lineCount - 1)
          const range = new Range(new Position(0, 0), lastLine.range.end)

          try {
            phpcbf.setStandard(document.uri.fsPath)
          } catch (err) {
            console.error('PHPCBF', 'Set Standard', err.message)
            return false
          }

          try {
            const fixedText = await phpcbf.format(originalText)
            if (fixedText !== '' && fixedText !== originalText) {
              return [new vscode.TextEdit(range, fixedText)]
            }
          } catch (err) {
            console.error('PHPCBF', 'Format', err.message)
            window.showErrorMessage(err.message)
            return false
          }
        }
      })
    )
  }
}
