import { getSupabaseClient } from '../../lib/supabase';
import type { Project } from '../../types';
import { requireActiveUser } from './libraryApiUtils';
import { requireMutationRow } from './mutationResult';
import { fetchAllRows } from './pagination';

export async function fetchProjects(): Promise<Project[]> {
    const [projects, memberships] = await Promise.all([
        fetchAllRows((from, to) => getSupabaseClient().from('projects').select('*')
            .order('sort_index').order('created_at').order('id').range(from, to)),
        fetchAllRows((from, to) => getSupabaseClient().from('project_citations')
            .select('project_id, citation_id').order('project_id').order('citation_id').range(from, to)),
    ]);
    const members = new Map<string, string[]>();
    for (const row of memberships) {
        const ids = members.get(row.project_id) ?? [];
        ids.push(row.citation_id);
        members.set(row.project_id, ids);
    }
    return projects.map(row => ({ id: row.id, name: row.name, sortIndex: row.sort_index,
        citationIds: members.get(row.id) ?? [] }));
}

export async function createProjectWithCitations(userId: string, id: string, name: string, citationIds: string[]): Promise<Project> {
    await requireActiveUser(userId, 'project creation');
    const { data, error } = await getSupabaseClient().rpc('create_project_with_citations', {
        expected_user_id: userId, requested_project_id: id, requested_name: name.trim(), citation_ids: citationIds,
    });
    if (error) throw error;
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        typeof data.id !== 'string' || typeof data.name !== 'string' || typeof data.sortIndex !== 'number' ||
        !Array.isArray(data.citationIds) || !data.citationIds.every(id => typeof id === 'string')) {
        throw new Error('Invalid project creation response');
    }
    return { id: data.id, name: data.name, sortIndex: data.sortIndex, citationIds: data.citationIds as string[] };
}

export async function createProject(userId: string, name: string, id: string = crypto.randomUUID()) {
    return createProjectWithCitations(userId, id, name, []);
}

export async function reorderProjects(userId: string, orderedProjectIds: string[]) {
    await requireActiveUser(userId, 'project reorder');
    const { error } = await getSupabaseClient().rpc('reorder_projects', {
        expected_user_id: userId, ordered_project_ids: orderedProjectIds,
    });
    if (error) throw error;
}

export async function renameProject(userId: string, id: string, name: string) {
        const { data, error } = await getSupabaseClient()
            .from('projects')
            .update({ name: name.trim() })
            .eq('id', id)
            .eq('user_id', userId).select('id').maybeSingle();
        requireMutationRow(data, error, 'Project');
    }

export async function deleteProject(userId: string, id: string) {
        const { error } = await getSupabaseClient()
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
    }

export async function addCitationToProject(_userId: string, projectId: string, citationId: string) {
        const { error } = await getSupabaseClient()
            .from('project_citations')
            .upsert({ project_id: projectId, citation_id: citationId });

        if (error) throw error;
    }

export async function addCitationsToProject(_userId: string, projectId: string, citationIds: string[]) {
        if (citationIds.length === 0) return;

        const records = citationIds.map(cid => ({
            project_id: projectId,
            citation_id: cid
        }));

        const { error } = await getSupabaseClient()
            .from('project_citations')
            .upsert(records, { onConflict: 'project_id, citation_id', ignoreDuplicates: true });

        if (error) throw error;
    }
