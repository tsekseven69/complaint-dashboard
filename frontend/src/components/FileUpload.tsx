import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'

interface Props {
  onFile: (file: File) => Promise<void>
}

export default function FileUpload({ onFile }: Props) {
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setProcessing(true)
    try {
      await onFile(file)
    } catch (e: any) {
      setError(e.message || 'Файл уншихад алдаа гарлаа')
    } finally {
      setProcessing(false)
    }
  }, [onFile])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }, [handleFile])

  return (
    <>
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={onChange} />
        <Upload size={36} className="icon" />
        {processing ? (
          <p>Файл уншиж байна...</p>
        ) : (
          <p>Excel файлаа энд чирж оруулах эсвэл дарж сонгоно уу (.xlsx)</p>
        )}
      </div>
      {error && <div className="upload-error">{error}</div>}
    </>
  )
}
