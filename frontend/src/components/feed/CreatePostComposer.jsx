import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { UserAvatar } from '../common/UserAvatar';
import { 
  Image, 
  Video, 
  Briefcase, 
  Award, 
  X, 
  Globe,
  Users,
  ChevronDown,
  Upload,
  Loader2,
  FileText
} from 'lucide-react';

export const CreatePostComposer = ({ 
  initialExpanded = false, 
  onCloseModal, 
  editingPost = null, 
  onSaveEdit 
}) => {
  const { currentUser, usersMap, createPost, editPost, showNotification } = useApp();

  // Refs for inputs
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const textareaRef = useRef(null);

  const [isOpen, setIsOpen] = useState(initialExpanded || !!editingPost);
  const [postType, setPostType] = useState(editingPost ? (editingPost.postType || editingPost.type || 'TEXT') : 'TEXT');
  const [visibility, setVisibility] = useState(editingPost ? (editingPost.visibility || 'PUBLIC') : 'PUBLIC');
  const [content, setContent] = useState(editingPost ? editingPost.content : '');
  const [selectedTags, setSelectedTags] = useState(editingPost ? (editingPost.tags || editingPost.hashtags || []) : ['#JECRC']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);

  // Job Opportunity State
  const [jobTitle, setJobTitle] = useState(editingPost ? (editingPost.jobTitle || '') : '');
  const [companyName, setCompanyName] = useState(editingPost ? (editingPost.companyName || '') : '');
  const [jobLocation, setJobLocation] = useState(editingPost ? (editingPost.jobLocation || '') : '');
  const [employmentType, setEmploymentType] = useState(editingPost ? (editingPost.employmentType || 'Full-time') : 'Full-time');
  const [jobDescription, setJobDescription] = useState(editingPost ? (editingPost.jobDescription || '') : '');
  const [jobUrl, setJobUrl] = useState(editingPost ? (editingPost.jobUrl || '') : '');

  // Achievement State
  const [achievementTitle, setAchievementTitle] = useState(editingPost ? (editingPost.achievementTitle || '') : '');
  const [achievementOrg, setAchievementOrg] = useState(editingPost ? (editingPost.achievementOrganization || '') : '');
  const [achievementDate, setAchievementDate] = useState(editingPost ? (editingPost.achievementDate || '') : '');
  const [achievementDesc, setAchievementDesc] = useState(editingPost ? (editingPost.achievementDescription || '') : '');

  // Media files & preview
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(editingPost ? (editingPost.image || editingPost.imageUrl || editingPost.videoUrl) : null);
  const [mediaType, setMediaType] = useState(null); // 'IMAGE' or 'VIDEO'

  // Derived Helper Variables
  const isAlumni = currentUser?.roleUpper === 'ALUMNI' || currentUser?.role === 'alumni';
  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'there';
  const roleSubtitle = isAlumni ? 'Alumni' : (currentUser?.roleUpper === 'ADMIN' ? 'Administrator' : 'Student');
  const quickTags = ['#JECRC', '#Career', '#AlumniNetwork', '#Hiring', '#Achievement', '#Events'];

  // Reset Form
  const resetForm = () => {
    setContent('');
    setPostType('TEXT');
    setVisibility('PUBLIC');
    setSelectedTags(['#JECRC']);
    setMediaFiles([]);
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    setJobTitle('');
    setCompanyName('');
    setJobLocation('');
    setEmploymentType('Full-time');
    setJobDescription('');
    setJobUrl('');
    setAchievementTitle('');
    setAchievementOrg('');
    setAchievementDate('');
    setAchievementDesc('');
  };

  const handleClose = () => {
    setIsOpen(false);
    if (!editingPost) {
      resetForm();
    }
    if (onCloseModal) onCloseModal();
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1].toLowerCase());
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const matchingUsers = Object.values(usersMap || {})
    .filter((u) => {
      if (!mentionQuery) return true;
      const name = (u.name || u.fullName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(mentionQuery) || email.includes(mentionQuery);
    })
    .slice(0, 5);

  const insertMention = (user) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPos);
    const textAfterCursor = content.slice(cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIdx !== -1) {
      const mentionName = `@${user.name || user.fullName || 'User'} `;
      const newText = textBeforeCursor.slice(0, lastAtIdx) + mentionName + textAfterCursor;
      setContent(newText);
    }
    setShowMentionDropdown(false);
  };

  const handleToggleTag = (tag) => {
    setSelectedTags((prev) => 
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Handle Photo selection (Max 5 images)
  const MAX_IMAGES = 5;
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (mediaFiles.length + files.length > MAX_IMAGES) {
      showNotification(`You can upload a maximum of ${MAX_IMAGES} images per post.`, 'error');
      return;
    }

    const validFiles = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) {
        showNotification(`File ${f.name} is not a valid image format.`, 'error');
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        showNotification(`Image ${f.name} exceeds 10 MB limit.`, 'error');
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length > 0) {
      const updatedFiles = [...mediaFiles, ...validFiles];
      setMediaFiles(updatedFiles);
      setMediaType('IMAGE');
      setPostType('PHOTO');
      setIsOpen(true);
    }
    // reset file input
    if (e.target) e.target.value = '';
  };

  const handleRemoveSingleImage = (indexToRemove) => {
    const updated = mediaFiles.filter((_, idx) => idx !== indexToRemove);
    setMediaFiles(updated);
    if (updated.length === 0) {
      setMediaType(null);
      if (postType === 'PHOTO') setPostType('TEXT');
    }
  };

  // Handle Video selection
  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      showNotification('Video size must be less than 100 MB.', 'error');
      return;
    }

    setMediaFile(file);
    setMediaType('VIDEO');
    setPostType('VIDEO');
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);
    setIsOpen(true);
    if (e.target) e.target.value = '';
  };

  const handleRemoveMedia = () => {
    setMediaFiles([]);
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (postType === 'PHOTO' || postType === 'VIDEO') {
      setPostType('TEXT');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Post type validation
    if (postType === 'JOB') {
      if (!jobTitle.trim()) {
        showNotification('Job title is required', 'error');
        return;
      }
      if (!companyName.trim()) {
        showNotification('Company name is required', 'error');
        return;
      }
    } else if (postType === 'ACHIEVEMENT') {
      if (!achievementTitle.trim()) {
        showNotification('Achievement title is required', 'error');
        return;
      }
    } else {
      if (!content.trim() && mediaFiles.length === 0 && !mediaFile && !mediaPreview) {
        showNotification('Please add text content or media to your post.', 'error');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        content: content.trim(),
        postType,
        type: postType,
        visibility,
        tags: selectedTags,
        hashtags: selectedTags,
        mediaFiles,
        mediaFile: mediaFiles.length > 0 ? mediaFiles[0] : mediaFile,
        // Job fields
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim(),
        jobLocation: jobLocation.trim(),
        employmentType,
        jobDescription: jobDescription.trim(),
        jobUrl: jobUrl.trim(),
        // Achievement fields
        achievementTitle: achievementTitle.trim(),
        achievementOrganization: achievementOrg.trim(),
        achievementDate,
        achievementDescription: achievementDesc.trim(),
      };

      if (editingPost) {
        if (onSaveEdit) {
          await onSaveEdit(editingPost.id, payload);
        } else {
          await editPost(editingPost.id, payload);
        }
        showNotification('Post updated successfully.', 'success');
      } else {
        await createPost(payload);
        showNotification('Post published successfully.', 'success');
      }

      resetForm();
      handleClose();
    } catch (err) {
      console.error('Failed to publish post:', err);
      showNotification(err.message || 'Failed to publish post. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={photoInputRef}
        onChange={handlePhotoSelect}
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleVideoSelect}
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
      />

      {/* 1. Collapsed Composer Invitation */}
      {!editingPost && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3.5 transition-all hover:border-slate-300">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={currentUser.avatar}
              name={currentUser.name}
              className="w-10 h-10 shrink-0"
            />
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="w-full text-left bg-slate-100/90 hover:bg-slate-100 border border-slate-200/80 rounded-full px-4 py-2.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              What's on your mind, {firstName}?
            </button>
          </div>

          {/* Quick Actions Toolbar */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer group"
              >
                <Image className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>Photos</span>
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer group"
              >
                <Video className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                <span>Video</span>
              </button>

              {isAlumni && (
                <button
                  type="button"
                  onClick={() => {
                    setPostType('JOB');
                    setIsOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <Briefcase className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span>Job Opportunity</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setPostType('ACHIEVEMENT');
                  setIsOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer group"
              >
                <Award className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                <span>Achievement</span>
              </button>
            </div>

            {/* Visibility & Red Post button */}
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="text-xs font-medium text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white cursor-pointer outline-none hover:bg-slate-50"
              >
                <option value="PUBLIC">Public</option>
                <option value="CONNECTIONS">Connections</option>
              </select>

              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-700 hover:bg-red-800 transition-colors cursor-pointer shadow-2xs"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Expanded Composer Modal Dialog */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{editingPost ? 'Edit Post' : 'Create Post'}</span>
              </h3>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Author Identity & Post Visibility Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserAvatar src={currentUser.avatar} name={currentUser.name} className="w-9 h-9" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">{currentUser.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{roleSubtitle}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
                  >
                    <option value="PUBLIC">🌐 Anyone</option>
                    <option value="CONNECTIONS">👥 Connections</option>
                  </select>
                </div>
              </div>

              {/* Main Content Text Area with @Mentions */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  placeholder={`Share an update, announcement, or request with JECRC...`}
                  className="w-full text-xs text-slate-800 placeholder-slate-400 outline-none resize-none min-h-[90px] leading-relaxed"
                  aria-label="Post content"
                />

                {showMentionDropdown && matchingUsers.length > 0 && (
                  <div className="absolute left-0 top-full z-20 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto w-64 p-1 space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">Mention Member</p>
                    {matchingUsers.map((user) => (
                      <button
                        key={user.id || user.userId}
                        type="button"
                        onClick={() => insertMention(user)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                      >
                        <UserAvatar src={user.avatar || user.avatarUrl} name={user.name || user.fullName} className="w-6 h-6 text-[10px]" />
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-900 block truncate">{user.name || user.fullName}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{user.role || 'Member'} {user.branch ? `• ${user.branch}` : ''}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-Image Preview Grid (Up to 5 Photos) */}
              {mediaFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      Attached Photos ({mediaFiles.length} / {MAX_IMAGES})
                    </span>
                    {mediaFiles.length < MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="text-[11px] font-semibold text-red-700 hover:underline cursor-pointer"
                      >
                        + Add photo
                      </button>
                    )}
                  </div>

                  <div className={`grid gap-2 ${
                    mediaFiles.length === 1 ? 'grid-cols-1' :
                    mediaFiles.length === 2 ? 'grid-cols-2' :
                    mediaFiles.length === 3 ? 'grid-cols-3' : 'grid-cols-4 sm:grid-cols-5'
                  }`}>
                    {mediaFiles.map((file, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Upload preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer shadow-md"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video or Legacy Media Preview */}
              {mediaPreview && mediaFiles.length === 0 && (
                <div className="relative border border-slate-200 rounded-lg p-2 bg-slate-50 flex items-center justify-center overflow-hidden max-h-56">
                  {mediaType === 'VIDEO' || (mediaFile && mediaFile.type.startsWith('video/')) ? (
                    <video
                      src={mediaPreview}
                      controls
                      className="max-h-48 w-full object-contain rounded-md"
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Upload preview"
                      className="max-h-48 w-full object-contain rounded-md"
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="absolute top-3 right-3 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer shadow-md"
                    title="Remove media"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* JOB Post Type Form */}
              {postType === 'JOB' && (
                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-lg space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                    <Briefcase className="w-4 h-4 text-purple-700" />
                    <span>Job Opportunity Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Job Title *"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-purple-200 rounded outline-none text-slate-800"
                    />
                    <input
                      type="text"
                      placeholder="Company Name *"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-purple-200 rounded outline-none text-slate-800"
                    />
                    <input
                      type="text"
                      placeholder="Job Location (e.g. Bengaluru / Remote)"
                      value={jobLocation}
                      onChange={(e) => setJobLocation(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-purple-200 rounded outline-none text-slate-800"
                    />
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-purple-200 rounded outline-none text-slate-800"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Job Description / Key Requirements..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-purple-200 rounded outline-none text-slate-800 resize-none"
                  />
                  <input
                    type="url"
                    placeholder="Application URL (e.g. https://careers.company.com/...)"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-purple-200 rounded outline-none text-slate-800"
                  />
                </div>
              )}

              {/* ACHIEVEMENT Post Type Form */}
              {postType === 'ACHIEVEMENT' && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Award className="w-4 h-4 text-amber-700" />
                    <span>Achievement / Milestone Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Achievement Title *"
                      value={achievementTitle}
                      onChange={(e) => setAchievementTitle(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-amber-200 rounded outline-none text-slate-800"
                    />
                    <input
                      type="text"
                      placeholder="Organization / Institution"
                      value={achievementOrg}
                      onChange={(e) => setAchievementOrg(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-amber-200 rounded outline-none text-slate-800"
                    />
                  </div>
                  <input
                    type="date"
                    value={achievementDate}
                    onChange={(e) => setAchievementDate(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-amber-200 rounded outline-none text-slate-800"
                  />
                  <textarea
                    rows={2}
                    placeholder="Achievement Details / Story..."
                    value={achievementDesc}
                    onChange={(e) => setAchievementDesc(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-amber-200 rounded outline-none text-slate-800 resize-none"
                  />
                </div>
              )}

              {/* Hashtag Suggestions */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-medium">Tags:</span>
                {quickTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`text-[11px] font-medium px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-red-700 text-white font-semibold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Add to your post toolbar */}
              <div className="p-3 bg-slate-50 border border-slate-200/75 rounded-lg space-y-2">
                <span className="text-[11px] font-semibold text-slate-600 block">
                  Add to your post
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                      postType === 'PHOTO' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Image className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                      postType === 'VIDEO' ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-blue-600" />
                    <span>Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPostType(postType === 'JOB' ? 'TEXT' : 'JOB')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                      postType === 'JOB' ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                    <span>Job</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPostType(postType === 'ACHIEVEMENT' ? 'TEXT' : 'ACHIEVEMENT')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                      postType === 'ACHIEVEMENT' ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>Achievement</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{editingPost ? 'Saving...' : 'Publishing...'}</span>
                    </>
                  ) : (
                    <span>{editingPost ? 'Save changes' : 'Post'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
