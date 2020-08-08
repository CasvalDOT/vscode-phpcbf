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
  ERR_ON_CREATING_TEMP_FILE:
    'PHPCBF: An error during temp file creation occured',
  ERR_ON_DELETING_TEMP_FILE:
    'PHPCBF: An error during temp file deletion occured',
  ERR_ZERO_FIXING_CONTENT_LENGTH: 'PHPCBF: Content is empty',
  ERR_PHPCBF_EXIT_CODE_2: 'PHPCBF: Failed to fix some errors',
  ERR_PHPCBF_EXIT_CODE_3: 'PHPCBF: General script execution error',
  ERR_PHPCBF_EXIT_CODE_16: 'PHPCBF: Configuration error of the application',
  ERR_PHPCBF_EXIT_CODE_32: 'PHPCBF: Configuration error of a fixer',
  ERR_PHPCBF_EXIT_CODE_64: 'PHPCBF: Exception raised within the application',
  ERR_PHPCBF_EXIT_CODE_UNDEFINED: 'PHPCBF: An error unhadler occured',
  ERR_PHPCBF_ENOENT: 'PHPCBF: Executable path not found'
}

module.exports = {
  PHPCBF_CONFIG_FILENAMES,
  PHPCBF_ERRORS,
  PHPCBF_VSCODE_COMMAND
}
