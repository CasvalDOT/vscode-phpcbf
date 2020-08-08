'use strict'

const vscode = require('vscode')
const { commands, workspace, window, languages, Range, Position } = vscode
const PHPCBF = require('./Phpcbf')
const VSCODE_COMMAND = 'phpcbf-soderlind'

// TODO
// Check if break all
const phpcbf = new PHPCBF()

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

function onWillSaveTextDocument (event) {
  if (isPhp(event) && !isFormatOnSaveEnabled() && phpcbf.onsave) {
    event.waitUntil(commands.executeCommand('editor.action.formatDocument'))
  }
}

function registerTextEditorCommand (event) {
  if (isPhp(event)) {
    commands.executeCommand('editor.action.formatDocument')
  }
}

function onDidChangeConfiguration () {
  phpcbf.loadSettings()
}

// EXPORT
exports.activate = context => {
  context.subscriptions.push(
    workspace.onWillSaveTextDocument(onWillSaveTextDocument)
  )

  context.subscriptions.push(
    commands.registerTextEditorCommand(
      VSCODE_COMMAND,
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

          let output
          try {
            output = phpcbf.format(document)
          } catch (err) {
            console.error(err.message)
          }

          if (output !== originalText) {
            return [new vscode.TextEdit(range, output)]
          }
        }
      })
    )
  }
}
