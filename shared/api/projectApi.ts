import { getSupabaseClient } from '../../lib/supabase';
import type { Project } from '../../types';
import { getNextSortIndex } from './libraryApiUtils';



export async function fetchProjects() {
        const { data, error } = await getSupabaseClient()
            .from('projects')
            .select(`
        *,
        project_citations(citation_id)
      `)
            .order('sort_index', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true });

        if (error) throw error;

        return data.map((p: any) => ({
            id: p.id,
            name: p.name,
            sortIndex: p.sort_index ?? null,
            citationIds: p.project_citations.map((pc: any) => pc.citation_id)
        } as Project));
    }

export async function createProject(userId: string, name: string) {
        const nextSortIndex = await getNextSortIndex('projects', userId);
        const { data, error } = await getSupabaseClient()
            .from('projects')
            .insert({ name, user_id: userId, sort_index: nextSortIndex })
            .select()
            .single();
        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            sortIndex: data.sort_index ?? null,
            citationIds: []
        } as Project;
    }

export async function reorderProjects(userId: string, orderedProjectIds: string[]) {
        const results = await Promise.all(
            orderedProjectIds.map((projectId, index) =>
                getSupabaseClient()
                    .from('projects')
                    .update({ sort_index: index })
                    .eq('id', projectId)
                    .eq('user_id', userId)
            )
        );
        const failed = results.find(result => result.error);
        if (failed?.error) throw failed.error;
    }

export async function renameProject(userId: string, id: string, name: string) {
        const { error } = await getSupabaseClient()
            .from('projects')
            .update({ name })
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
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
