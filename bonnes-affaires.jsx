import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, TrendingDown, ExternalLink, Filter, RefreshCw, Zap, Loader } from 'lucide-react';

// Configuration de l'API
const API_BASE_URL = 'http://localhost:8000/api';

const BonnesAffaires = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('iphone'); // Query pour l'API
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [minDiscount, setMinDiscount] = useState(50);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 5000 });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Données de l'API
  const [allProducts, setAllProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [locations, setLocations] = useState(['all']);
  const [categories, setCategories] = useState(['all']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger les données initiales
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Recherche initiale
      await searchProducts(searchQuery);
      
      // Charger les stats
      await loadStats();
      
      // Charger les filtres
      await loadFilters();
      
    } catch (err) {
      console.error('Erreur chargement initial:', err);
      setError('Impossible de charger les données. Vérifiez que le serveur API est démarré.');
    } finally {
      setIsLoading(false);
    }
  };

  const searchProducts = async (query) => {
    try {
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          platform: selectedPlatform === 'all' ? null : selectedPlatform,
          min_discount: minDiscount,
          max_results: 100
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }

      const data = await response.json();
      setAllProducts(data.products || []);
      setLastUpdate(new Date());
      
      console.log(`✅ ${data.products?.length || 0} produits chargés`, data.cached ? '(cache)' : '(nouveau scraping)');
      
    } catch (err) {
      console.error('Erreur recherche:', err);
      throw err;
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  };

  const loadFilters = async () => {
    try {
      // Charger les locations
      const locResponse = await fetch(`${API_BASE_URL}/locations`);
      if (locResponse.ok) {
        const locData = await locResponse.json();
        setLocations(['all', ...locData.locations]);
      }

      // Charger les catégories
      const catResponse = await fetch(`${API_BASE_URL}/categories`);
      if (catResponse.ok) {
        const catData = await catResponse.json();
        setCategories(['all', ...catData.categories]);
      }
    } catch (err) {
      console.error('Erreur filtres:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setSearchQuery(searchTerm);
    
    try {
      await searchProducts(searchTerm);
      await loadStats();
    } catch (err) {
      setError('Erreur lors de la recherche');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/refresh?query=${encodeURIComponent(searchQuery)}&platform=${selectedPlatform}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du rafraîchissement');
      }

      const data = await response.json();
      setAllProducts(data.products || []);
      setLastUpdate(new Date());
      await loadStats();
      
      console.log('✅ Données rafraîchies');
      
    } catch (err) {
      console.error('Erreur refresh:', err);
      setError('Erreur lors du rafraîchissement');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Filtrer les produits localement
  const filteredArticles = useMemo(() => {
    return allProducts.filter(article => {
      const matchesLocation = selectedLocation === 'all' || article.location === selectedLocation;
      const matchesDiscount = article.discount >= minDiscount;
      const matchesPlatform = selectedPlatform === 'all' || article.platform === selectedPlatform;
      const matchesPrice = article.priceSale >= priceRange.min && article.priceSale <= priceRange.max;
      const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
      
      return matchesLocation && matchesDiscount && matchesPlatform && matchesPrice && matchesCategory;
    });
  }, [allProducts, selectedLocation, minDiscount, selectedPlatform, priceRange, selectedCategory]);

  // Statistiques locales
  const localStats = useMemo(() => {
    const totalSavings = filteredArticles.reduce((sum, article) => 
      sum + (article.priceAverage - article.priceSale), 0
    );
    const avgDiscount = filteredArticles.length > 0 
      ? Math.round(filteredArticles.reduce((sum, a) => sum + a.discount, 0) / filteredArticles.length)
      : 0;
    
    return { totalSavings, avgDiscount };
  }, [filteredArticles]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Inter', sans-serif",
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      position: 'relative'
    }}>
      {/* En-tête */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '16px 16px'
        }}>
          <div className="header-flex" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <TrendingDown size={40} color="#667eea" strokeWidth={2.5} />
              <div>
                <h1 style={{
                  margin: 0,
                  fontSize: '32px',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em'
                }}>
                  Deals Finder AI
                </h1>
                <p style={{
                  margin: '4px 0 0 0',
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Analyse intelligente en temps réel • {filteredArticles.length} bonnes affaires
                </p>
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isAnalyzing}
              className="refresh-btn"
              style={{
                padding: '12px 20px',
                background: isAnalyzing ? '#e2e8f0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s',
                fontFamily: 'inherit'
              }}
            >
              <RefreshCw size={18} style={{
                animation: isAnalyzing ? 'spin 1s linear infinite' : 'none'
              }} />
              {isAnalyzing ? 'Analyse...' : 'Actualiser'}
            </button>
          </div>

          {/* Erreur */}
          {error && (
            <div style={{
              background: '#fee2e2',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '16px',
              color: '#991b1b',
              fontSize: '14px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Alerte d'explication */}
          <div className="alert-box" style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            border: '2px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <Zap size={24} color="#667eea" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{
                margin: '0 0 6px 0',
                fontSize: '15px',
                fontWeight: '700',
                color: '#1e293b'
              }}>
                Analyse automatique via API
              </p>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#475569',
                lineHeight: '1.5'
              }}>
                Ce système utilise une <strong>API backend</strong> qui scrape Leboncoin et Vinted en temps réel, 
                calcule les moyennes de prix et filtre automatiquement les bonnes affaires (min. 40% de réduction).
                <br />
                <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                  💡 Backend FastAPI • Cache 30min • Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
                </span>
              </p>
            </div>
          </div>

          {/* Statistiques */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div className="stat-card" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '12px',
              padding: '16px',
              color: 'white'
            }}>
              <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>
                Économies disponibles
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800' }}>
                {localStats.totalSavings.toLocaleString('fr-FR')}€
              </div>
            </div>
            
            <div className="stat-card" style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '12px',
              padding: '16px',
              color: 'white'
            }}>
              <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>
                Réduction moyenne
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800' }}>
                -{localStats.avgDiscount}%
              </div>
            </div>
            
            <div className="stat-card" style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '12px',
              padding: '16px',
              color: 'white'
            }}>
              <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>
                Total analysé
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800' }}>
                {allProducts.length}
              </div>
            </div>
          </div>

          {/* Barre de recherche */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px'
          }}>
            <div style={{ position: 'relative', gridColumn: 'span 2' }}>
              <Search size={20} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }} />
              <input
                type="text"
                placeholder="Rechercher (ex: iPhone 14, Nike Air...)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  width: '100%',
                  padding: '14px 120px 14px 48px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                onClick={handleSearch}
                disabled={isLoading}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isLoading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
                Rechercher
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <MapPin size={20} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none'
              }} />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '15px',
                  outline: 'none',
                  cursor: 'pointer',
                  backgroundColor: 'white',
                  fontFamily: 'inherit',
                  appearance: 'none'
                }}
              >
                <option value="all">Toutes les villes</option>
                {locations.filter(l => l !== 'all').map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div style={{ position: 'relative' }}>
              <Filter size={20} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none'
              }} />
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '15px',
                  outline: 'none',
                  cursor: 'pointer',
                  backgroundColor: 'white',
                  fontFamily: 'inherit',
                  appearance: 'none'
                }}
              >
                <option value="all">Toutes plateformes</option>
                <option value="leboncoin">Leboncoin</option>
                <option value="vinted">Vinted</option>
              </select>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <label style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569'
              }}>
                Réduction min: {minDiscount}%
              </label>
              <input
                type="range"
                min="40"
                max="90"
                step="10"
                value={minDiscount}
                onChange={(e) => setMinDiscount(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#667eea'
                }}
              />
            </div>
          </div>

          {/* Bouton recherche approfondie */}
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              style={{
                padding: '12px 24px',
                background: showAdvancedSearch ? 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)' : 'white',
                color: showAdvancedSearch ? 'white' : '#667eea',
                border: showAdvancedSearch ? 'none' : '2px solid #667eea',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'inherit'
              }}
            >
              <Filter size={18} />
              {showAdvancedSearch ? 'Masquer les filtres' : 'Filtres avancés'}
            </button>
          </div>

          {/* Filtres avancés */}
          {showAdvancedSearch && (
            <div style={{
              marginTop: '20px',
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
              borderRadius: '16px',
              border: '2px solid rgba(102, 126, 234, 0.2)',
              animation: 'slideDown 0.3s ease-out'
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#1e293b'
              }}>
                Filtres avancés
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#475569'
                  }}>
                    Catégorie
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '15px',
                      outline: 'none',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      fontFamily: 'inherit',
                      appearance: 'none'
                    }}
                  >
                    <option value="all">Toutes les catégories</option>
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#475569'
                  }}>
                    Prix minimum: {priceRange.min}€
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="50"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({...priceRange, min: Number(e.target.value)})}
                    style={{
                      width: '100%',
                      accentColor: '#667eea'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#475569'
                  }}>
                    Prix maximum: {priceRange.max}€
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="50"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({...priceRange, max: Number(e.target.value)})}
                    style={{
                      width: '100%',
                      accentColor: '#667eea'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setPriceRange({ min: 0, max: 5000 });
                      setMinDiscount(40);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: '#f1f5f9',
                      color: '#475569',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: 'inherit'
                    }}
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grille d'articles */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px 16px'
      }}>
        <div style={{
          marginBottom: '20px',
          color: 'white',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
              Chargement...
            </span>
          ) : (
            <>
              {filteredArticles.length} bonne{filteredArticles.length > 1 ? 's' : ''} affaire{filteredArticles.length > 1 ? 's' : ''} • 
              {localStats.totalSavings > 0 && ` ${localStats.totalSavings.toLocaleString('fr-FR')}€ d'économies possibles`}
            </>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {filteredArticles.map((article, index) => (
            <div
              key={article.id}
              className="article-card"
              style={{
                background: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                animation: `slideIn 0.5s ease-out ${(index % 20) * 0.05}s both`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
              }}
            >
              {/* Image/Emoji */}
              <div style={{
                position: 'relative',
                paddingTop: '75%',
                overflow: 'hidden',
                background: article.color
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '80px',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                }}>
                  {article.emoji}
                </div>
                
                {/* Badge réduction */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: article.discount >= 70 ? '#ef4444' : article.discount >= 60 ? '#f97316' : '#eab308',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '999px',
                  fontWeight: '800',
                  fontSize: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  animation: 'pulse 2s infinite'
                }}>
                  -{article.discount}%
                </div>

                {/* Badge plateforme */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: article.platform === 'leboncoin' ? '#ff6e14' : '#09b1ba',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {article.platform === 'leboncoin' ? 'LBC' : 'Vinted'}
                </div>

                {/* Badge temps */}
                {article.postedHoursAgo < 24 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    background: '#10b981',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '11px'
                  }}>
                    Il y a {article.postedHoursAgo}h
                  </div>
                )}
              </div>

              {/* Contenu */}
              <div style={{ padding: '20px' }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#1e293b',
                  lineHeight: '1.4',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {article.title}
                </h3>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  color: '#64748b',
                  fontSize: '14px'
                }}>
                  <MapPin size={16} />
                  <span>{article.location}</span>
                  <span style={{ margin: '0 4px' }}>•</span>
                  <span>{article.category}</span>
                </div>

                {/* Prix */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '800',
                      color: '#667eea'
                    }}>
                      {article.priceSale}€
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#94a3b8',
                      textDecoration: 'line-through'
                    }}>
                      Moyenne: {article.priceAverage}€
                    </div>
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#10b981'
                  }}>
                    -{article.priceAverage - article.priceSale}€
                  </div>
                </div>

                {/* Bouton */}
                <a 
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <button style={{
                    width: '100%',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'transform 0.2s'
                  }}>
                    Voir l'offre
                    <ExternalLink size={18} />
                  </button>
                </a>

                <div style={{
                  marginTop: '12px',
                  fontSize: '13px',
                  color: '#94a3b8',
                  textAlign: 'center'
                }}>
                  Vendeur: {article.seller}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pas de résultats */}
        {!isLoading && filteredArticles.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            color: '#64748b'
          }}>
            <TrendingDown size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
              Aucune affaire trouvée
            </h3>
            <p style={{ margin: 0, fontSize: '15px' }}>
              Essayez de modifier vos critères de recherche ou de lancer une nouvelle recherche
            </p>
          </div>
        )}
      </div>

      <style>
        {`
          * {
            -webkit-tap-highlight-color: transparent;
          }

          html, body {
            overflow-x: hidden;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slideDown {
            from {
              opacity: 0;
              max-height: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              max-height: 500px;
              transform: translateY(0);
            }
          }

          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          select {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
            padding-right: 40px !important;
          }

          input[type="range"] {
            -webkit-appearance: none;
            height: 6px;
            border-radius: 3px;
            background: #e2e8f0;
            outline: none;
          }

          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #667eea;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
          }

          input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #667eea;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
          }

          @media (max-width: 768px) {
            .stat-card {
              padding: 12px !important;
            }
            
            h1 {
              font-size: 24px !important;
            }

            button {
              font-size: 14px !important;
              padding: 10px 16px !important;
            }

            input[type="range"]::-webkit-slider-thumb {
              width: 24px;
              height: 24px;
            }

            input[type="range"]::-moz-range-thumb {
              width: 24px;
              height: 24px;
            }

            .article-card {
              margin-bottom: 8px;
            }

            .article-card > div {
              padding: 16px !important;
            }

            .header-flex {
              flex-direction: column;
              align-items: flex-start !important;
              gap: 12px !important;
            }

            .refresh-btn {
              width: 100%;
              justify-content: center !important;
            }

            .alert-box {
              padding: 12px !important;
            }

            .alert-box p {
              font-size: 13px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default BonnesAffaires;
