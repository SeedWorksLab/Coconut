import { Fragment } from 'react';
import { Text } from 'react-native-paper';

export function ReleaseNoteText({ notes }: { notes: string }) {
  return <>{notes.split(/\n\s*\n/).map((block, index) => (
    <Fragment key={index}>
      <Text variant={/^### /.test(block) ? 'titleSmall' : 'bodyMedium'}>
        {block.replace(/^### /, '').replace(/^- /gm, '• ')}
      </Text>
      <Text>{'\n'}</Text>
    </Fragment>
  ))}</>;
}
