// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const AudioManager = {
  requestRecordingPermissions: jest.fn().mockResolvedValue("Granted"),
};

const AudioRecorder = jest.fn().mockImplementation(() => ({
  onAudioReady: jest.fn(),
  start: jest.fn().mockReturnValue({ status: "ok" }),
  stop: jest.fn(),
  isRecording: jest.fn().mockReturnValue(false),
}));

module.exports = { AudioManager, AudioRecorder };
