import {gql, useQuery} from '@apollo/client';
import {Box, Colors, NonIdealState, Spinner, TextInput, Tooltip} from '@dagster-io/ui-components';
import * as React from 'react';

import {PYTHON_ERROR_FRAGMENT} from '../app/PythonErrorFragment';
import {FIFTEEN_SECONDS, useQueryRefreshAtInterval} from '../app/QueryRefresh';
import {useTrackPageView} from '../app/analytics';
import {useDocumentTitle} from '../hooks/useDocumentTitle';
import {useQueryPersistedState} from '../hooks/useQueryPersistedState';
import {useSelectionReducer} from '../hooks/useSelectionReducer';
import {filterPermissionedInstigationState} from '../instigation/filterPermissionedInstigationState';
import {BASIC_INSTIGATION_STATE_FRAGMENT} from '../overview/BasicInstigationStateFragment';
import {ScheduleBulkActionMenu} from '../schedules/ScheduleBulkActionMenu';
import {makeScheduleKey} from '../schedules/makeScheduleKey';
import {CheckAllBox} from '../ui/CheckAllBox';
import {useFilters} from '../ui/Filters';
import {useInstigationStatusFilter} from '../ui/Filters/useInstigationStatusFilter';

import {VirtualizedScheduleTable} from './VirtualizedScheduleTable';
import {WorkspaceHeader} from './WorkspaceHeader';
import {repoAddressAsHumanString} from './repoAddressAsString';
import {repoAddressToSelector} from './repoAddressToSelector';
import {RepoAddress} from './types';
import {
  WorkspaceSchedulesQuery,
  WorkspaceSchedulesQueryVariables,
} from './types/WorkspaceSchedulesRoot.types';

export const WorkspaceSchedulesRoot = ({repoAddress}: {repoAddress: RepoAddress}) => {
  useTrackPageView();

  const repoName = repoAddressAsHumanString(repoAddress);
  useDocumentTitle(`Schedules: ${repoName}`);

  const selector = repoAddressToSelector(repoAddress);
  const [searchValue, setSearchValue] = useQueryPersistedState<string>({
    queryKey: 'search',
    defaults: {search: ''},
  });

  const runningStateFilter = useInstigationStatusFilter();
  const filters = React.useMemo(() => [runningStateFilter], [runningStateFilter]);
  const {button: filterButton, activeFiltersJsx} = useFilters({filters});

  const queryResultOverview = useQuery<WorkspaceSchedulesQuery, WorkspaceSchedulesQueryVariables>(
    WORKSPACE_SCHEDULES_QUERY,
    {
      fetchPolicy: 'network-only',
      notifyOnNetworkStatusChange: true,
      variables: {selector},
    },
  );
  const {data, loading} = queryResultOverview;
  const refreshState = useQueryRefreshAtInterval(queryResultOverview, FIFTEEN_SECONDS);

  const sanitizedSearch = searchValue.trim().toLocaleLowerCase();
  const anySearch = sanitizedSearch.length > 0;

  const schedules = React.useMemo(() => {
    if (data?.repositoryOrError.__typename === 'Repository') {
      return data.repositoryOrError.schedules;
    }
    return [];
  }, [data]);

  const {state: runningState} = runningStateFilter;
  const filteredByRunningState = React.useMemo(() => {
    return runningState.size
      ? schedules.filter(({scheduleState}) => runningState.has(scheduleState.status))
      : schedules;
  }, [schedules, runningState]);

  const filteredBySearch = React.useMemo(() => {
    const searchToLower = sanitizedSearch.toLocaleLowerCase();
    return filteredByRunningState.filter(({name}) =>
      name.toLocaleLowerCase().includes(searchToLower),
    );
  }, [filteredByRunningState, sanitizedSearch]);

  const anySchedulesVisible = filteredBySearch.length > 0;

  const permissionedSchedules = React.useMemo(() => {
    return filteredBySearch.filter(({scheduleState}) =>
      filterPermissionedInstigationState(scheduleState),
    );
  }, [filteredBySearch]);

  const permissionedKeys = React.useMemo(() => {
    return permissionedSchedules.map(({name}) => makeScheduleKey(repoAddress, name));
  }, [permissionedSchedules, repoAddress]);

  const [{checkedIds: checkedKeys}, {onToggleFactory, onToggleAll}] = useSelectionReducer(
    permissionedKeys,
  );

  const checkedSchedules = React.useMemo(() => {
    return permissionedSchedules
      .filter(({name}) => checkedKeys.has(makeScheduleKey(repoAddress, name)))
      .map(({name, scheduleState}) => {
        return {repoAddress, scheduleName: name, scheduleState};
      });
  }, [permissionedSchedules, checkedKeys, repoAddress]);

  const permissionedCount = permissionedKeys.length;
  const checkedCount = checkedKeys.size;

  const viewerHasAnyInstigationPermission = permissionedKeys.length > 0;

  const content = () => {
    if (loading && !data) {
      return (
        <Box flex={{direction: 'row', justifyContent: 'center'}} style={{paddingTop: '100px'}}>
          <Box flex={{direction: 'row', alignItems: 'center', gap: 16}}>
            <Spinner purpose="body-text" />
            <div style={{color: Colors.Gray600}}>Loading schedules…</div>
          </Box>
        </Box>
      );
    }

    if (!filteredBySearch.length) {
      if (anySearch) {
        return (
          <Box padding={{top: 20}}>
            <NonIdealState
              icon="search"
              title="No matching schedules"
              description={
                <div>
                  No schedules matching <strong>{searchValue}</strong> were found in {repoName}
                </div>
              }
            />
          </Box>
        );
      }

      return (
        <Box padding={{top: 20}}>
          <NonIdealState
            icon="search"
            title="No schedules"
            description={`No schedules were found in ${repoName}`}
          />
        </Box>
      );
    }

    return (
      <VirtualizedScheduleTable
        repoAddress={repoAddress}
        schedules={filteredBySearch}
        headerCheckbox={
          viewerHasAnyInstigationPermission ? (
            <CheckAllBox
              checkedCount={checkedCount}
              totalCount={permissionedCount}
              onToggleAll={onToggleAll}
            />
          ) : undefined
        }
        checkedKeys={checkedKeys}
        onToggleCheckFactory={onToggleFactory}
      />
    );
  };

  return (
    <Box flex={{direction: 'column'}} style={{height: '100%', overflow: 'hidden'}}>
      <WorkspaceHeader
        repoAddress={repoAddress}
        tab="schedules"
        refreshState={refreshState}
        queryData={queryResultOverview}
      />
      <Box padding={{horizontal: 24, vertical: 16}} flex={{justifyContent: 'space-between'}}>
        <Box flex={{direction: 'row', gap: 12}}>
          {filterButton}
          <TextInput
            icon="search"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              onToggleAll(false);
            }}
            placeholder="Filter by schedule name…"
            style={{width: '340px'}}
          />
        </Box>
        <Tooltip
          content="You do not have permission to start or stop these schedules"
          canShow={anySchedulesVisible && !viewerHasAnyInstigationPermission}
          placement="top-end"
          useDisabledButtonTooltipFix
        >
          <ScheduleBulkActionMenu
            schedules={checkedSchedules}
            onDone={() => refreshState.refetch()}
          />
        </Tooltip>
      </Box>
      {activeFiltersJsx.length ? (
        <Box
          padding={{vertical: 8, horizontal: 24}}
          border="top-and-bottom"
          flex={{direction: 'row', gap: 8}}
        >
          {activeFiltersJsx}
        </Box>
      ) : null}
      {loading && !data ? (
        <Box padding={64}>
          <Spinner purpose="page" />
        </Box>
      ) : (
        content()
      )}
    </Box>
  );
};

const WORKSPACE_SCHEDULES_QUERY = gql`
  query WorkspaceSchedulesQuery($selector: RepositorySelector!) {
    repositoryOrError(repositorySelector: $selector) {
      ... on Repository {
        id
        name
        schedules {
          id
          name
          description
          scheduleState {
            id
            ...BasicInstigationStateFragment
          }
        }
      }
      ...PythonErrorFragment
    }
  }

  ${BASIC_INSTIGATION_STATE_FRAGMENT}
  ${PYTHON_ERROR_FRAGMENT}
`;
