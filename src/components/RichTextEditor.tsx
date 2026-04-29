 import { useEditor, EditorContent } from '@tiptap/react';
 import StarterKit from '@tiptap/starter-kit';
 import Underline from '@tiptap/extension-underline';
 import Link from '@tiptap/extension-link';
 import TextAlign from '@tiptap/extension-text-align';
 import Color from '@tiptap/extension-color';
 import { TextStyle } from '@tiptap/extension-text-style';
 import Highlight from '@tiptap/extension-highlight';
 import { 
   Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, 
   AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, 
   Heading1, Heading2, Heading3, Highlighter, Quote, Undo, Redo, Eraser
 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 
 const Separator = () => <div className="w-[1px] h-6 bg-border mx-1" />;
 
 interface RichTextEditorProps {
   content: string;
   onChange: (content: string) => void;
 }
 
 const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
   const editor = useEditor({
     extensions: [
       StarterKit,
       Underline,
       Link.configure({
         openOnClick: false,
       }),
       TextAlign.configure({
         types: ['heading', 'paragraph'],
       }),
       TextStyle,
       Color,
       Highlight,
     ],
     content: content,
     onUpdate: ({ editor }) => {
       onChange(editor.getHTML());
     },
   });
 
   if (!editor) {
     return null;
   }
 
   return (
     <div className="border rounded-md overflow-hidden bg-background">
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