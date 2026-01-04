# REPLAY MP4 PIPELINE TESTS WORKORDER

- [x] Locate requestRender tests in services/__tests__/replayMp4Pipeline.spec.js and identify pipeline setup helpers.
- [x] Add test case where store.getByHash returns an existing entry; assert requestRender returns it and queue size is unchanged.
- [x] Add test case where store.getByReplay returns an existing entry; assert requestRender returns it and queue size is unchanged.
- [x] Ensure expected entry matches the returned object in both cases.
