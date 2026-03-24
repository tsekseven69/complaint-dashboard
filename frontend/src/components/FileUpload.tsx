import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { uploadExcel, UploadResult } from '../api/client'

interface Props {
  onUploadSuccess: (result: UploadResult) => void
}

export default function FileUpload({ onUploadSuccess }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const result = await uploadExcel(file)
      onUploadSuccess(result)
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [onUploadSuccess])

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
        {uploading ? (
          <p>Файл уншиж байна...</p>
        ) : (
          <p>Excel файлаа энд чирж оруулах эсвэл дарж сонгоно уу (.xlsx)</p>
        )}
      </div>
      {error && <div className="upload-error">{error}</div>}
    </>
  )
}
