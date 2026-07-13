 import { useEditor, EditorContent } from '@tiptap/react';
 import StarterKit from '@tiptap/starter-kit';
 import Underline from '@tiptap/extension-underline';
 import Link from '@tiptap/extension-link';
 import TextAlign from '@tiptap/extension-text-align';
 import Color from '@tiptap/extension-color';
 import { TextStyle } from '@tiptap/extension-text-style';
 import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
 import { 
   Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, 
   AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, 
  Heading1, Heading2, Heading3, Highlighter, Quote, Undo, Redo, Eraser,
  ImagePlus, Youtube as YoutubeIcon, Film
 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 
 const Separator = () => <div className="w-[1px] h-6 bg-border mx-1" />;
 
 interface RichTextEditorProps {
   content: string;
   onChange: (content: string) => void;
 }
 
 const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
   const editor = useEditor({
     extensions: [
       StarterKit,
       Underline,
       Link.configure({
         openOnClick: false,
       }),
       TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
       }),
       TextStyle,
       Color,
       Highlight,
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'rounded-md max-w-full h-auto inline-block' },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        HTMLAttributes: { class: 'rounded-md w-full aspect-video my-4' },
      }),
     ],
     content: content,
     onUpdate: ({ editor }) => {
       onChange(editor.getHTML());
     },
   });
 
   if (!editor) {
     return null;
   }
 
  const handleImageUpload = async (file: File) => {
    try {
      const ext = file.name.split('.').pop();
      const fileName = `help/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('ticket-attachments').getPublicUrl(fileName);
      editor.chain().focus().setImage({ src: data.publicUrl }).run();
    } catch (e) {
      // Fallback: embed as base64
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file);
    }
  };

  const insertVideoLink = () => {
    const url = window.prompt('Cole o link do vídeo (YouTube, Vimeo, etc):');
    if (!url) return;
    const trimmed = url.trim();
    // YouTube
    if (/youtube\.com|youtu\.be/.test(trimmed)) {
      editor.chain().focus().setYoutubeVideo({ src: trimmed, width: 640, height: 360 }).run();
      return;
    }
    // Vimeo / others: embed via iframe HTML
    let embed = trimmed;
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      embed = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    const html = `<div class="video-embed my-4"><iframe src="${embed}" class="rounded-md w-full aspect-video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen frameborder="0"></iframe></div><p></p>`;
    editor.chain().focus().insertContent(html).run();
  };

   return (
     <div className="border rounded-md overflow-hidden bg-background">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageUpload(f);
          e.target.value = '';
        }}
      />
       <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/50 border-b">
         <Button
           type="button"
           variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().toggleBold().run()}
         >
           <Bold className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().toggleItalic().run()}
         >
           <Italic className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().toggleUnderline().run()}
         >
           <UnderlineIcon className="h-4 w-4" />
         </Button>
         
         <Separator />
         
         <Button
           type="button"
           variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
         >
           <Heading1 className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
         >
           <Heading2 className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
         >
           <Heading3 className="h-4 w-4" />
         </Button>
         
         <Separator />
         
         <Button
           type="button"
           variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().toggleBulletList().run()}
         >
           <List className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().toggleOrderedList().run()}
         >
           <ListOrdered className="h-4 w-4" />
         </Button>
         
         <Separator />
         
         <Button
           type="button"
           variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().setTextAlign('left').run()}
         >
           <AlignLeft className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().setTextAlign('center').run()}
         >
           <AlignCenter className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().setTextAlign('right').run()}
         >
           <AlignRight className="h-4 w-4" />
         </Button>
         
         <Separator />
         
         <Button
           type="button"
           variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().toggleBlockquote().run()}
         >
           <Quote className="h-4 w-4" />
         </Button>
         <Button
           type="button"
           variant={editor.isActive('highlight') ? 'secondary' : 'ghost'}
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().toggleHighlight().run()}
         >
           <Highlighter className="h-4 w-4" />
         </Button>
         
         <Separator />
         
         <Button
           type="button"
           variant="ghost"
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => {
             const url = window.prompt('URL do link:');
             if (url) {
               editor.chain().focus().setLink({ href: url }).run();
             }
           }}
         >
           <LinkIcon className="h-4 w-4" />
         </Button>
         
         <Button
           variant="ghost"
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().unsetLink().run()}
           disabled={!editor.isActive('link')}
         >
           <Eraser className="h-4 w-4" />
         </Button>

        <Separator />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Inserir imagem (upload)"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Imagem por URL"
          onClick={() => {
            const url = window.prompt('URL da imagem:');
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
        >
          <ImageIconInline />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Inserir vídeo (YouTube / Vimeo / outros)"
          onClick={insertVideoLink}
        >
          <Film className="h-4 w-4" />
        </Button>
         
         <Separator />
         
         <Button
           type="button"
           variant="ghost"
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().undo().run()}
         >
           <Undo className="h-4 w-4" />
         </Button>
         <Button
           variant="ghost"
           size="sm"
           className="h-8 w-8 p-0"
           onClick={() => editor.chain().focus().redo().run()}
         >
           <Redo className="h-4 w-4" />
         </Button>
       </div>
       <EditorContent 
         editor={editor} 
         className="min-h-[300px] p-4 prose prose-sm max-w-none focus:outline-none dark:prose-invert" 
       />
     </div>
   );
 };
 
 export default RichTextEditor;