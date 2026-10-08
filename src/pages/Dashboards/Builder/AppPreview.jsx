import React from 'react';
import { AppRuntime } from '../../Runtime/AppRuntime';

export function AppPreview({
  application,
  pages = [],
  navigation = null,
  activePageSlug,
  onExitPreview
}) {
  return (
    <AppRuntime
      previewMode={true}
      propAppId={application?.id}
      initialActivePageSlug={activePageSlug}
      onExitPreview={onExitPreview}
    />
  );
}
