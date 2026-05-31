import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react'

interface ExcelUploadModalProps {
  categorySlug: string
  categoryName: string
  onClose: () => void
  onSuccess: () => void
}

export default function ExcelUploadModal({
  categorySlug,
  categoryName,
  onClose,
  onSuccess,
}: ExcelUploadModalProps) {
  const [step, setStep] = useState<
    'upload' | 'mapping' | 'processing' | 'result'
  >('upload')

  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const [headers, setHeaders] = useState<string[]>([])
  const [preview, setPreview] = useState<any[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fieldOptions = [
    { key: 'businessName', label: 'Business Name *' },
    { key: 'ownerName', label: 'Owner Name' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'city', label: 'City / Location' },
    { key: 'googleProfileUrl', label: 'Google Profile URL' },
    { key: 'googleReviewCount', label: 'Google Reviews' },
    { key: 'notes', label: 'Notes' },
  ]

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(true)
    },
    []
  )

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)

      const droppedFile = e.dataTransfer.files[0]

      if (droppedFile) {
        handleFile(droppedFile)
      }
    },
    []
  )

  const handleFileInput = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = e.target.files?.[0]

    if (selectedFile) {
      handleFile(selectedFile)
    }
  }

  const handleFile = async (selectedFile: File) => {
    try {
      const validExtensions = ['.xlsx', '.xls', '.csv', '.json']
      const ext = selectedFile.name
        .slice(selectedFile.name.lastIndexOf('.'))
        .toLowerCase()

      if (!validExtensions.includes(ext)) {
        alert('Please upload a .xlsx, .xls, .csv, or .json file')
        return
      }

      setFile(selectedFile)
      setLoading(true)

      const response = await api.detectColumns(selectedFile)
      console.log('Detect Columns Raw Response:', response)

      // Fix: Some Axios setups bundle response attributes inside response.data
      const data = response?.data ? response.data : response

      const safeHeaders = Array.isArray(data?.headers)
        ? data.headers.filter(
            (h: any) =>
              typeof h === 'string' &&
              h.trim() !== ''
          )
        : []

      const safePreview = Array.isArray(data?.preview)
        ? data.preview
        : []

      setHeaders(safeHeaders)
      setPreview(safePreview)
      setMapping(data?.detectedMapping || {})

      setStep('mapping')
    } catch (error: any) {
      console.error(error)
      alert(
        error?.response?.data?.error ||
          error?.message ||
          'Failed to detect columns'
      )
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    try {
      if (!file) return

      setLoading(true)
      setStep('processing')

      const response = await api.uploadExcel(
        categorySlug,
        file,
        mapping
      )

      const data = response?.data ? response.data : response
      setResult(data)
      setStep('result')
      onSuccess()
    } catch (error: any) {
      console.error(error)
      alert(
        error?.response?.data?.error || 
          error?.message || 
          'Upload failed'
      )
      setStep('mapping')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      <div className="relative bg-[#171717] rounded-2xl border border-[#262626] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626]">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Upload Leads
            </h2>
            <p className="text-xs text-[#737373]">
              Import leads into {categoryName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-[#737373] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                dragOver
                  ? 'border-[#F59E0B] bg-[#F59E0B]/5'
                  : 'border-[#262626]'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-7 h-7 text-[#F59E0B]" />
              </div>

              <p className="text-white font-medium mb-1">
                Drag and drop your file here
              </p>

              <p className="text-xs text-[#737373] mb-4">
                Supports .xlsx, .xls, .csv, .json
              </p>

              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-black rounded-lg cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" />
                Browse Files
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
            </div>
          )}

          {step === 'mapping' && (
            <div>
              <p className="text-sm text-[#737373] mb-4">
                Map your file columns
              </p>

              {headers.length === 0 && (
                <div className="text-red-400 text-sm mb-4">
                  No headers detected from file 😭 Check if data array structure matches.
                </div>
              )}

              <div className="space-y-3">
                {fieldOptions.map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center gap-3"
                  >
                    <label className="text-sm text-white w-40">
                      {field.label}
                    </label>

                    <div className="relative flex-1">
                      <select
                        value={mapping[field.key] || ''}
                        onChange={(e) =>
                          setMapping((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] rounded-lg text-white appearance-none"
                      >
                        <option value="">
                          -- Ignore --
                        </option>

                        {headers.map((h) => (
                          <option
                            key={h}
                            value={h}
                            defaultValue={mapping[field.key]}
                          >
                            {h}
                          </option>
                        ))}
                      </select>

                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-[#F59E0B] mx-auto mb-4" />
              <p className="text-white">
                Uploading leads...
              </p>
            </div>
          )}

          {step === 'result' && result && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />

              <h3 className="text-xl font-semibold text-white mb-4">
                Upload Complete
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <p className="text-2xl font-bold text-white">
                    {result.summary?.total || 0}
                  </p>
                  <p className="text-xs text-[#737373]">
                    Total
                  </p>
                </div>

                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <p className="text-2xl font-bold text-green-400">
                    {result.summary?.created || 0}
                  </p>
                  <p className="text-xs text-[#737373]">
                    Created
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#262626]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#737373]"
          >
            Close
          </button>

          {step === 'mapping' && (
            <button
              onClick={handleUpload}
              disabled={
                loading ||
                !mapping.businessName
              }
              className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-black rounded-lg disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Upload Leads
            </button>
          )}
        </div>
      </div>
    </div>
  )
}