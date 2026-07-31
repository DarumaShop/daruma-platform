"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  tagsApi,
  Tag,
} from "../../../../features/tags/api/tags.api";
import { useState, useEffect } from "react";

// Componente para un nodo individual del árbol que maneja su propio estado de expansión
function TagNode({
  tag,
  level,
  onDelete,
  onEdit,
  onAddSub,
  isDeleting,
}: {
  tag: Tag;
  level: number;
  onDelete: (tag: Tag) => void;
  onEdit: (tag: Tag) => void;
  onAddSub: (tag: Tag) => void;
  isDeleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = tag.children && tag.children.length > 0;

  return (
    <li className="flex flex-col">
      <div className="flex justify-between items-center bg-white p-3 rounded shadow-sm border mb-2">
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-500 hover:text-gray-700 w-6 h-6 flex items-center justify-center bg-gray-100 rounded"
            >
              {expanded ? "-" : "+"}
            </button>
          ) : (
            <div className="w-6 h-6" /> // Placeholder to align texts
          )}
          <span className="font-medium text-gray-800">{tag.name}</span>
          <span className="text-gray-400 text-sm">({tag.slug})</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onEdit(tag)}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Editar
          </button>
          <button
            onClick={() => onAddSub(tag)}
            className="text-blue-500 hover:text-blue-700 text-sm font-medium"
          >
            + Añadir Sub-etiqueta
          </button>
          <button
            onClick={() => onDelete(tag)}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            Eliminar
          </button>
        </div>
      </div>
      {expanded && hasChildren && (
        <ul className="pl-6 border-l-2 border-gray-200 ml-3">
          {tag.children!.map((child) => (
            <TagNode
              key={child.slug}
              tag={child}
              level={level + 1}
              onDelete={onDelete}
              onEdit={onEdit}
              onAddSub={onAddSub}
              isDeleting={isDeleting}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// Sub-componente para seleccionar el padre con buscador
function ParentTagSelector({ 
  tags, 
  value, 
  onChange, 
  currentTagSlug 
}: { 
  tags: Tag[], 
  value: string | null, 
  onChange: (val: string | null) => void,
  currentTagSlug?: string
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const flattenTags = (tagList: Tag[], prefix = ""): { slug: string; name: string }[] => {
    let result: { slug: string; name: string }[] = [];
    for (const t of tagList) {
      if (t.slug === currentTagSlug) continue; // No puede ser padre de sí mismo
      result.push({ slug: t.slug, name: `${prefix}${t.name}` });
      if (t.children) {
        result = result.concat(flattenTags(t.children, `${prefix}${t.name} > `));
      }
    }
    return result;
  };

  const flatList = flattenTags(tags);
  const selectedTag = flatList.find(t => t.slug === value);

  const filtered = flatList.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <div 
        className="w-full border rounded p-2 text-black bg-white cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {value ? selectedTag?.name : "Ninguno (Etiqueta Principal)"}
        </span>
        <span className="text-gray-400 text-xs">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-60 flex flex-col">
          <div className="p-2 border-b">
            <input 
              type="text" 
              placeholder="Buscar por nombre o slug..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded p-1 text-sm text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            <div 
              className={`p-2 text-sm cursor-pointer hover:bg-blue-50 ${value === null ? "bg-blue-100 font-medium" : ""}`}
              onClick={() => { onChange(null); setIsOpen(false); setSearch(""); }}
            >
              Ninguno (Etiqueta Principal)
            </div>
            {filtered.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">No se encontraron etiquetas</div>
            ) : (
              filtered.map(t => (
                <div 
                  key={t.slug}
                  className={`p-2 text-sm cursor-pointer hover:bg-blue-50 ${value === t.slug ? "bg-blue-100 font-medium" : ""}`}
                  onClick={() => { onChange(t.slug); setIsOpen(false); setSearch(""); }}
                >
                  {t.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TagsPage() {
  const queryClient = useQueryClient();
  const [selectedParent, setSelectedParent] = useState<Tag | null>(null);

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    step: "confirm" | "cascade" | "edit" | "create";
    tag: Tag | null;
  }>({
    isOpen: false,
    step: "confirm",
    tag: null,
  });
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [suggestedSlug, setSuggestedSlug] = useState("");
  const [editParentSlug, setEditParentSlug] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  // Query: Get Tags
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: tagsApi.getTags,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: tagsApi.createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tagsApi.deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: tagsApi.updateTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      closeModal();
    },
  });

  const handleCreateClick = (parentTag: Tag | null = null) => {
    setEditName("");
    setEditSlug("");
    setSuggestedSlug("");
    setSlugStatus("idle");
    setEditParentSlug(parentTag ? parentTag.slug : null);
    setModalState({ isOpen: true, step: "create", tag: null });
  };

  const handleDeleteClick = (tag: Tag) => {
    setModalState({ isOpen: true, step: "confirm", tag });
  };

  const handleEditClick = (tag: Tag) => {
    // Buscar recursivamente el parentSlug actual
    let currentParentSlug: string | null = null;
    const findParent = (list: Tag[], parentSlg: string | null = null) => {
      for (const t of list) {
        if (t.slug === tag.slug) currentParentSlug = parentSlg;
        if (t.children) findParent(t.children, t.slug);
      }
    };
    findParent(tags);

    setEditName(tag.name);
    setEditSlug("");
    setSuggestedSlug(tag.slug);
    setEditParentSlug(currentParentSlug);
    setSlugStatus("idle");
    setModalState({ isOpen: true, step: "edit", tag });
  };

  // Live slug validation
  useEffect(() => {
    if ((modalState.step !== 'edit' && modalState.step !== 'create') || !editSlug.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlugStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      // If it's the exact same slug as the current tag (for edit), it's valid
      if (modalState.step === 'edit' && editSlug.trim() === modalState.tag?.slug) {
        setSlugStatus("available");
        return;
      }

      setSlugStatus("checking");
      try {
        const res = await tagsApi.validateSlug(editSlug.trim());
        setSlugStatus(res.available ? "available" : "taken");
      } catch {
        setSlugStatus("taken"); // default to taken on error
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [editSlug, modalState.step, modalState.tag?.slug]);

  // Live slug suggestion from backend
  useEffect(() => {
    if (modalState.step !== 'edit' && modalState.step !== 'create') return;
    
    // If the name is exactly the original name (for edit), suggestion is just the original slug
    if (modalState.step === 'edit' && editName.trim() === modalState.tag?.name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestedSlug(modalState.tag?.slug || "");
      return;
    }

    if (!editName.trim()) {
      setSuggestedSlug("");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await tagsApi.suggestSlug({
          name: editName.trim(),
          ignoreSlug: modalState.tag?.slug,
        });
        setSuggestedSlug(res.slug);
      } catch {
        // Fallback to empty if error
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [editName, modalState.step, modalState.tag?.name, modalState.tag?.slug]);

  const executeCreate = () => {
    if (!editName.trim()) return;
    createMutation.mutate({
      name: editName,
      slug: editSlug.trim() || undefined,
      parentSlug: editParentSlug === "" ? undefined : (editParentSlug || undefined),
    });
  };

  const executeEdit = () => {
    if (!modalState.tag) return;
    updateMutation.mutate({
      slug: modalState.tag.slug,
      data: {
        name: editName,
        slug: editSlug.trim() || undefined,
        parentSlug: editParentSlug === "" ? null : editParentSlug,
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!modalState.tag) return;

    const hasChildren =
      modalState.tag.children && modalState.tag.children.length > 0;

    if (hasChildren) {
      setModalState((prev) => ({ ...prev, step: "cascade" }));
    } else {
      executeDelete(false);
    }
  };

  const executeDelete = (cascade: boolean) => {
    if (!modalState.tag) return;
    deleteMutation.mutate({ slug: modalState.tag.slug, cascade });

    if (selectedParent?.slug === modalState.tag.slug) {
      setSelectedParent(null);
    }
    closeModal();
  };

  const closeModal = () => {
    setModalState({ isOpen: false, step: "confirm", tag: null });
    setEditName("");
    setEditSlug("");
    setSuggestedSlug("");
    setEditParentSlug(null);
    setSlugStatus("idle");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Gestión de Etiquetas
        </h1>
        <button
          onClick={() => handleCreateClick(null)}
          className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition-colors"
        >
          + Crear Nueva Etiqueta
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          Listado de Etiquetas
        </h2>
        {isLoading ? (
          <p className="text-gray-500">Cargando etiquetas...</p>
        ) : tags.length === 0 ? (
          <p className="text-gray-500">No hay etiquetas creadas.</p>
        ) : (
          <ul className="space-y-1">
            {tags.map((tag) => (
              <TagNode
                key={tag.slug}
                tag={tag}
                level={0}
                onDelete={handleDeleteClick}
                onEdit={handleEditClick}
                onAddSub={(t) => handleCreateClick(t)}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Modal Overlay */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-visible animate-in fade-in zoom-in-95 duration-200">
            {modalState.step === "confirm" && modalState.tag ? (
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Eliminar Etiqueta
                </h3>
                <p className="text-gray-600 mb-6">
                  ¿Estás seguro de que deseas eliminar la etiqueta{" "}
                  <span className="font-semibold">&quot;{modalState.tag.name}&quot;</span>
                  ?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ) : modalState.step === "edit" ? (
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Editar Etiqueta
                </h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border rounded p-2 text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug Personalizado (Opcional)
                    </label>
                    <input
                      value={editSlug}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setEditSlug(val);
                      }}
                      placeholder={suggestedSlug || "Escribe un slug..."}
                      className={`w-full border rounded p-2 text-black bg-white focus:outline-none focus:ring-2 ${
                        slugStatus === "taken"
                          ? "border-red-500 focus:ring-red-500"
                          : slugStatus === "available"
                            ? "border-green-500 focus:ring-green-500"
                            : "focus:ring-blue-500"
                      }`}
                    />
                    {slugStatus === "checking" && (
                      <p className="text-xs text-gray-500 mt-1">
                        Verificando disponibilidad...
                      </p>
                    )}
                    {slugStatus === "taken" && (
                      <p className="text-xs text-red-500 mt-1">
                        Este slug ya está en uso
                      </p>
                    )}
                    {slugStatus === "available" && (
                      <p className="text-xs text-green-500 mt-1">
                        Slug disponible
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Padre
                    </label>
                    <ParentTagSelector 
                      tags={tags} 
                      value={editParentSlug} 
                      onChange={setEditParentSlug} 
                      currentTagSlug={modalState.tag?.slug}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeEdit}
                    disabled={
                      updateMutation.isPending ||
                      slugStatus === "checking" ||
                      slugStatus === "taken"
                    }
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending
                      ? "Guardando..."
                      : "Guardar Cambios"}
                  </button>
                </div>
              </div>
            ) : modalState.step === "create" ? (
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Crear Nueva Etiqueta
                </h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ej: Electrónica, Ropa, etc."
                      className="w-full border rounded p-2 text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug Personalizado (Opcional)
                    </label>
                    <input
                      value={editSlug}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setEditSlug(val);
                      }}
                      placeholder={suggestedSlug || "Escribe un slug..."}
                      className={`w-full border rounded p-2 text-black bg-white focus:outline-none focus:ring-2 ${
                        slugStatus === "taken"
                          ? "border-red-500 focus:ring-red-500"
                          : slugStatus === "available"
                            ? "border-green-500 focus:ring-green-500"
                            : "focus:ring-blue-500"
                      }`}
                    />
                    {slugStatus === "checking" && (
                      <p className="text-xs text-gray-500 mt-1">
                        Verificando disponibilidad...
                      </p>
                    )}
                    {slugStatus === "taken" && (
                      <p className="text-xs text-red-500 mt-1">
                        Este slug ya está en uso
                      </p>
                    )}
                    {slugStatus === "available" && (
                      <p className="text-xs text-green-500 mt-1">
                        Slug disponible
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Padre
                    </label>
                    <ParentTagSelector 
                      tags={tags} 
                      value={editParentSlug} 
                      onChange={setEditParentSlug} 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeCreate}
                    disabled={
                      createMutation.isPending ||
                      !editName.trim() ||
                      slugStatus === "checking" ||
                      slugStatus === "taken"
                    }
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createMutation.isPending
                      ? "Creando..."
                      : "Crear Etiqueta"}
                  </button>
                </div>
              </div>
            ) : modalState.step === "cascade" && modalState.tag ? (
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Sub-etiquetas Detectadas
                </h3>
                <p className="text-gray-600 mb-6">
                  La etiqueta{" "}
                  <span className="font-semibold">&quot;{modalState.tag.name}&quot;</span>{" "}
                  contiene sub-etiquetas. ¿Qué deseas hacer con ellas?
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => executeDelete(true)}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Borrar Todo en Cascada
                  </button>
                  <button
                    onClick={() => executeDelete(false)}
                    className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 border border-blue-200"
                  >
                    Conservar sub-etiquetas (Mover a la raíz)
                  </button>
                  <button
                    onClick={closeModal}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 underline mt-2"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
