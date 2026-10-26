import type { HomeScrollController } from "../scroll"
import type { HomeSessionSearchController } from "./search"
import type { HomeSessionsController } from "./controller"
import { HomeSessionsView } from "./view"
import { Show } from "solid-js"

export function HomeSessions(props: {
  sessions: HomeSessionsController
  search: HomeSessionSearchController
  scroll: HomeScrollController
}) {
  return (
    <Show when={props.sessions.session.server()}>
      {(server) => (
        <HomeSessionsView
          language={props.sessions.copy.language}
          groups={props.sessions.data.groups()}
          groupCollapsed={props.sessions.groups.collapsed}
          groupStatus={props.sessions.groups.status}
          onToggleGroupCollapsed={props.sessions.groups.toggleCollapsed}
          groupTerminalVisibility={props.sessions.groups.terminalVisibility}
          onToggleGroupTerminal={props.sessions.groups.toggleTerminal}
          onMoveGroup={props.sessions.groups.move}
          onRemoveGroup={props.sessions.groups.remove}
          loading={props.sessions.data.loading()}
          desktop={props.sessions.platform.desktop}
          location={props.sessions.location.value}
          onRevealLocations={props.sessions.location.sync}
          showProjectName={props.sessions.session.showProjectName()}
          server={server()}
          canCreateSession={props.sessions.session.canCreate()}
          searchValue={props.search.query.value()}
          searchPlaceholder={props.search.query.placeholder()}
          searchOpen={props.search.query.open()}
          searchLoading={props.search.result.loading()}
          searchResults={props.search.result.list()}
          searchActive={props.search.result.active()}
          searchNoResultsLabel={props.search.result.noResultsLabel()}
          isOpenTab={props.sessions.tab.isOpen}
          sessionTags={props.sessions.tags.for}
          statusFilterTags={props.sessions.tags.statusFilterTags()}
          onToggleStatusFilter={props.sessions.tags.toggleStatusFilter}
          onEditTags={props.sessions.tags.edit}
          onEditNote={props.sessions.note.edit}
          onToggleTag={props.sessions.tags.toggle}
          initiatives={props.sessions.initiatives}
          onCreateSession={props.sessions.session.create}
          onOpenSession={props.sessions.session.open}
          onArchiveSession={props.sessions.session.archive}
          onRenameSession={props.sessions.session.rename}
          onExportSession={props.sessions.session.export}
          onDeleteSession={props.sessions.session.showDelete}
          onSetHoverTarget={props.scroll.viewport.setHoverTarget}
          onSetThumbTrack={props.scroll.viewport.setThumbTrack}
          onWheel={props.scroll.viewport.containWheel}
          onSetSearchRoot={props.search.element.setRoot}
          onSetSearchInput={props.search.element.setInput}
          onSetSearchList={props.search.element.setList}
          onSearchFocus={props.search.query.focus}
          onSearchInput={props.search.query.input}
          onSearchClose={props.search.query.close}
          onSearchMove={props.search.result.move}
          onSearchSelectActive={props.search.result.selectActive}
          onSearchHighlight={props.search.result.highlight}
          onSearchSelect={props.search.result.select}
        />
      )}
    </Show>
  )
}
