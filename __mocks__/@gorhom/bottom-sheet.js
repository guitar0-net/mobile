// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const React = require("react");
const { View, TextInput, ScrollView } = require("react-native");

const BottomSheet = React.forwardRef(function BottomSheet({ children }, ref) {
  React.useImperativeHandle(ref, () => ({
    expand: jest.fn(),
    close: jest.fn(),
    snapToIndex: jest.fn(),
    snapToPosition: jest.fn(),
    forceClose: jest.fn(),
    collapse: jest.fn(),
  }));
  return React.createElement(View, null, children);
});

// Like the real modal, renders nothing until present() is called.
const BottomSheetModal = React.forwardRef(function BottomSheetModal(
  { children, onDismiss },
  ref,
) {
  const [presented, setPresented] = React.useState(false);
  React.useImperativeHandle(ref, () => ({
    present: () => setPresented(true),
    dismiss: () => {
      setPresented(false);
      onDismiss?.();
    },
    close: jest.fn(),
    expand: jest.fn(),
    snapToIndex: jest.fn(),
  }));
  return presented ? React.createElement(View, null, children) : null;
});

function BottomSheetView({ children }) {
  return React.createElement(View, null, children);
}

function BottomSheetScrollView({ children }) {
  return React.createElement(ScrollView, null, children);
}

function BottomSheetBackdrop() {
  return null;
}

function BottomSheetModalProvider({ children }) {
  return children;
}

const BottomSheetTextInput = React.forwardRef(
  function BottomSheetTextInput(props, ref) {
    return React.createElement(TextInput, { ...props, ref });
  },
);

module.exports = {
  __esModule: true,
  default: BottomSheet,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetModal,
  BottomSheetModalProvider,
};
