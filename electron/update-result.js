function availableVersion(result) {
  return result?.isUpdateAvailable ? result.updateInfo.version : null;
}

module.exports = { availableVersion };
