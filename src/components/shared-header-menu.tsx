import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Divider,
  Icon,
  IconButton,
  List,
  Menu,
  Text as PaperText,
} from 'react-native-paper';
import dayjs from 'dayjs';
import type { SharedPeriodReport, SharedSpace, SharedSpaceMember } from '../models';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme';
import { sharedMemberName } from '../utils/shared-members';

export interface SharedHeaderMenuProps {
  spaces: SharedSpace[];
  selectedSpace: SharedSpace | null;
  members: SharedSpaceMember[];
  reports: SharedPeriodReport[];
  pendingInvites: SharedSpaceMember[];
  canInvite: boolean;
  canManage: boolean;
  canClosePeriod: boolean;
  busy: boolean;
  currentMemberId: number | null;
  onSelectSpace: (space: SharedSpace) => void;
  onCreateSpace: () => void;
  onInvite: () => void;
  onAcceptInvite: (member: SharedSpaceMember) => void;
  onRenameSpace: () => void;
  onRemoveMember: (member: SharedSpaceMember) => void;
  onLeaveSpace: () => void;
  onDeleteSpace: () => void;
  onOpenBalances: () => void;
  onOpenReport: (periodId: number) => void;
  onClosePeriod: () => void;
}

type MenuMode = 'spaces' | 'space';

export function SharedHeaderMenu({
  spaces,
  selectedSpace,
  members,
  reports,
  pendingInvites,
  canInvite,
  canManage,
  canClosePeriod,
  busy,
  onSelectSpace,
  onCreateSpace,
  onInvite,
  onAcceptInvite,
  onRenameSpace,
  onRemoveMember,
  onLeaveSpace,
  onDeleteSpace,
  onOpenBalances,
  onOpenReport,
  onClosePeriod,
  currentMemberId,
}: SharedHeaderMenuProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<MenuMode>('spaces');

  const openMenu = () => {
    setMode(selectedSpace ? 'space' : 'spaces');
    setVisible(true);
  };
  const closeMenu = () => setVisible(false);

  const spaceName = (spaceId: number): string =>
    spaces.find((space) => space.id === spaceId)?.name ?? `Space #${spaceId}`;

  return (
    <Menu
      visible={visible}
      onDismiss={closeMenu}
      contentStyle={styles.menuContent}
      anchor={
        <IconButton
          icon="menu"
          iconColor={theme.colors.onSurface}
          onPress={openMenu}
          accessibilityLabel={t('menu.accessibility')}
        />
      }
    >
      {mode === 'spaces' ? (
        <>
          <Menu.Item
            leadingIcon="plus"
            title={t('menu.newSpace')}
            disabled={busy}
            onPress={() => {
              closeMenu();
              onCreateSpace();
            }}
          />
          {spaces.length > 0 ? <Divider /> : null}
          {spaces.length === 0 ? (
            <PaperText variant="bodySmall" style={styles.hint}>
              {t('menu.noSpaces')}
            </PaperText>
          ) : (
            spaces.map((space) => (
              <Menu.Item
                key={space.id}
                leadingIcon="account-group-outline"
                title={space.name}
                onPress={() => {
                  onSelectSpace(space);
                  setMode('space');
                }}
              />
            ))
          )}
          {pendingInvites.length > 0 ? (
            <>
              <Divider />
              <PaperText variant="labelLarge" style={styles.sectionLabel}>
                {t('menu.pendingInvites')}
              </PaperText>
              {pendingInvites.map((invite) => (
                <List.Item
                  key={invite.id}
                  title={spaceName(invite.spaceId)}
                  description={invite.email ?? undefined}
                  left={(props) => <List.Icon {...props} icon="email-outline" />}
                  right={() => (
                    <Button
                      mode="contained-tonal"
                      compact
                      disabled={busy}
                      onPress={() => onAcceptInvite(invite)}
                    >
                      {t('menu.accept')}
                    </Button>
                  )}
                />
              ))}
            </>
          ) : null}
        </>
      ) : selectedSpace ? (
        <>
          <Menu.Item
            leadingIcon="arrow-left"
            title={t('menu.allSpaces')}
            onPress={() => setMode('spaces')}
          />
          <Divider />
          <PaperText variant="labelLarge" style={styles.sectionLabel}>
            {selectedSpace.name}
          </PaperText>
          <Menu.Item
            leadingIcon="scale-balance"
            title={t('menu.balances')}
            onPress={() => {
              closeMenu();
              onOpenBalances();
            }}
          />
          {canInvite ? (
            <Menu.Item
              leadingIcon="account-plus-outline"
              title={t('menu.invite')}
              disabled={busy}
              onPress={() => {
                closeMenu();
                onInvite();
              }}
            />
          ) : null}
          {canManage ? (
            <Menu.Item
              leadingIcon="pencil-outline"
              title={t('menu.rename')}
              disabled={busy}
              onPress={() => {
                closeMenu();
                onRenameSpace();
              }}
            />
          ) : null}
          <Divider />
          <PaperText variant="labelLarge" style={styles.sectionLabel}>
            {t('menu.members')}
          </PaperText>
          {members.map((member) => {
            const isSelf = currentMemberId !== null && member.id === currentMemberId;
            const right = isSelf
              ? member.role !== 'owner'
                ? () => (
                    <IconButton
                      icon="door-open"
                      iconColor={theme.semantic.delete}
                      disabled={busy}
                      onPress={() => {
                        closeMenu();
                        onLeaveSpace();
                      }}
                      accessibilityLabel={t('menu.leave')}
                    />
                  )
                : undefined
              : canManage && member.role !== 'owner'
                ? () => (
                    <IconButton
                      icon="account-remove-outline"
                      disabled={busy}
                      onPress={() => {
                        closeMenu();
                        onRemoveMember(member);
                      }}
                      accessibilityLabel={t('menu.removeMember', { name: sharedMemberName(member) })}
                    />
                  )
                : undefined;
            return (
              <List.Item
                key={member.id}
                title={sharedMemberName(member)}
                description={
                  member.role === 'owner'
                    ? t('shared.roleOwner')
                    : member.status === 'pending'
                      ? t('shared.rolePending')
                      : t('shared.roleMember')
                }
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={member.role === 'owner' ? 'crown-outline' : 'account-outline'}
                  />
                )}
                right={right}
              />
            );
          })}
          {reports.length > 0 ? (
            <>
              <Divider />
              <PaperText variant="labelLarge" style={styles.sectionLabel}>
                {t('menu.closedPeriods')}
              </PaperText>
              {reports.map((entry) => (
                <Menu.Item
                  key={entry.id}
                  leadingIcon="file-document-outline"
                  title={`${dayjs(entry.report.periodStart).format('D MMM')} – ${dayjs(
                    entry.report.periodEnd
                  ).format('D MMM YYYY')}`}
                  onPress={() => {
                    closeMenu();
                    onOpenReport(entry.periodId);
                  }}
                />
              ))}
            </>
          ) : null}
          {canManage ? (
            <>
              <Divider style={styles.dangerDivider} />
              <Menu.Item
                leadingIcon={({ color, size }) => (
                  <Icon source="trash-can-outline" size={size} color={theme.semantic.delete} />
                )}
                title={t('menu.delete')}
                titleStyle={{ color: theme.semantic.delete }}
                disabled={busy}
                onPress={() => {
                  closeMenu();
                  onDeleteSpace();
                }}
              />
            </>
          ) : null}
          <View style={styles.closeWrapper}>
            <Button
              mode="contained"
              icon="lock-outline"
              disabled={!canClosePeriod || busy}
              onPress={() => {
                closeMenu();
                onClosePeriod();
              }}
              style={styles.closeButton}
              contentStyle={styles.closeButtonContent}
            >
              {t('menu.closePeriod')}
            </Button>
          </View>
        </>
      ) : null}
    </Menu>
  );
}

const styles = StyleSheet.create({
  menuContent: {
    minWidth: 300,
    paddingBottom: 0,
  },
  hint: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    opacity: 0.7,
  },
  sectionLabel: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    opacity: 0.7,
  },
  closeWrapper: {
    marginTop: 8,
  },
  dangerDivider: {
    marginTop: 8,
    marginBottom: 4,
  },
  closeButton: {
    borderRadius: 0,
  },
  closeButtonContent: {
    width: '100%',
    paddingVertical: 4,
  },
});
