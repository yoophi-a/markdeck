const DESKTOP_ERROR_CODES = Object.freeze({
  CONTENT_ROOT_NOT_SET: 'CONTENT_ROOT_NOT_SET',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  UNSAFE_PATH: 'UNSAFE_PATH',
});

const DIRECTORY_PICKER_RESULT_KEYS = ['canceled', 'filePaths'];
const DESKTOP_COMMANDS = Object.freeze([
  'focus-search',
  'go-back',
  'go-browse',
  'go-forward',
  'go-home',
  'go-search',
  'open-content-root',
  'open-recent-content-root',
  'reload-content',
  'toggle-command-palette',
  'toggle-theme',
]);

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Expected ${label} to be an object`);
  }
}

function assertFunction(value, label) {
  if (typeof value !== 'function') {
    throw new TypeError(`Expected ${label} to be a function`);
  }
}

function normalizeDesktopCommandPayload(command, payload = null) {
  if (command === 'open-recent-content-root') {
    if (payload == null || typeof payload === 'string') {
      return payload;
    }

    assertObject(payload, 'open-recent-content-root payload');
    if (payload.contentRoot != null && typeof payload.contentRoot !== 'string') {
      throw new TypeError('Expected open-recent-content-root payload.contentRoot to be a string');
    }

    return payload;
  }

  return payload;
}

function normalizeDirectoryPickerResult(result) {
  assertObject(result, 'directory picker result');

  for (const key of DIRECTORY_PICKER_RESULT_KEYS) {
    if (!(key in result)) {
      throw new TypeError(`Expected directory picker result.${key} to exist`);
    }
  }

  if (typeof result.canceled !== 'boolean') {
    throw new TypeError('Expected directory picker result.canceled to be a boolean');
  }

  if (!Array.isArray(result.filePaths) || result.filePaths.some((value) => typeof value !== 'string')) {
    throw new TypeError('Expected directory picker result.filePaths to be an array of strings');
  }

  return {
    canceled: result.canceled,
    filePaths: [...result.filePaths],
  };
}

function normalizeDesktopError(error) {
  if (error?.message === 'Unsafe path outside of content root') {
    return { code: DESKTOP_ERROR_CODES.UNSAFE_PATH, message: error.message };
  }

  if (error?.code === 'CONTENT_ROOT_NOT_SET') {
    return { code: DESKTOP_ERROR_CODES.CONTENT_ROOT_NOT_SET, message: '읽을 문서 폴더를 먼저 선택해 주세요.' };
  }

  if (error?.code === 'ENOENT') {
    return { code: DESKTOP_ERROR_CODES.NOT_FOUND, message: '파일이나 폴더를 찾을 수 없습니다.' };
  }

  if (error?.code === 'EACCES' || error?.code === 'EPERM') {
    return { code: DESKTOP_ERROR_CODES.PERMISSION_DENIED, message: '파일이나 폴더에 접근할 권한이 없습니다.' };
  }

  if (error instanceof TypeError) {
    return { code: DESKTOP_ERROR_CODES.INVALID_INPUT, message: error.message };
  }

  return { code: DESKTOP_ERROR_CODES.UNKNOWN_ERROR, message: error?.message || '알 수 없는 desktop 오류가 발생했습니다.' };
}

module.exports = {
  DESKTOP_COMMANDS,
  DESKTOP_ERROR_CODES,
  assertFunction,
  assertObject,
  normalizeDesktopCommandPayload,
  normalizeDesktopError,
  normalizeDirectoryPickerResult,
};
