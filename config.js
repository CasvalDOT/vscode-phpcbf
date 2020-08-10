const PHPCBF_CONFIG_FILENAMES = [
  '.phpcs.xml',
  '.phpcs.xml.dist',
  'phpcs.xml',
  'phpcs.xml.dist',
  'phpcs.ruleset.xml',
  'ruleset.xml'
]

const PHPCBF_VSCODE_COMMAND = 'phpcbf-heply'

/*
  phpcbf exit codes:
  Exit code 0 is used to indicate that no fixable errors were found, so nothing was fixed
  Exit code 1 is used to indicate that all fixable errors were fixed correctly
  Exit code 2 is used to indicate that PHPCBF failed to fix some of the fixable errors it found
  Exit code 3 is used for general script execution errors
*/

const PHPCBF_ERRORS = {
  ERR_ON_CREATING_TEMP_FILE: 'An error during temp file creation occured',
  ERR_ON_DELETING_TEMP_FILE: 'An error during temp file deletion occured',
  ERR_ZERO_FIXING_CONTENT_LENGTH: 'Content is empty',
  ERR_PHPCBF_EXIT_CODE_2: 'Failed to fix some errors',
  ERR_PHPCBF_EXIT_CODE_3: 'General script execution error',
  ERR_PHPCBF_EXIT_CODE_16: 'Configuration error of the application',
  ERR_PHPCBF_EXIT_CODE_32: 'Configuration error of a fixer',
  ERR_PHPCBF_EXIT_CODE_64: 'Exception raised within the application',
  ERR_PHPCBF_EXIT_CODE_UNDEFINED: 'An error unhadler occured',
  ERR_PHPCBF_ENOENT: 'Executable path not found',
  ERR_PHPCBF_BIN_ENOENT: 'No such file phpcbf',
  ERR_PHPCBF_INVALID_WORKSPACE:
    'Workspace is invalid, try to use global binary of phpcbf'
}

const PHPCBF_NO_FIXABLE_ERRORS = 0

module.exports = {
  PHPCBF_CONFIG_FILENAMES,
  PHPCBF_ERRORS,
  PHPCBF_VSCODE_COMMAND,
  PHPCBF_NO_FIXABLE_ERRORS
}
