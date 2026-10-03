// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const AudioManager = {
  requestRecordingPermissions: jest.fn().mockResolvedValue("Granted"),
};

const AudioRecorder = jest.fn().mockImplementation(() => ({
  onAudioReady: jest.fn(),
  start: jest.fn().mockResolvedValue({ status: "success" }),
  clearOnAudioReady: jest.fn(),
  stop: jest.fn(),
  isRecording: jest.fn().mockReturnValue(false),
}));

module.exports = { AudioManager, AudioRecorder };
